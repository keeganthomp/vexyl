'use client';

import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
  createCloseAccountInstruction,
  createBurnInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  getRecentBlockhash,
  sendTransaction as sendTxServer,
  simulateTransaction,
} from '@/app/actions/rpc';

interface TokenToClose {
  mint: string;
  tokenProgram?: string;
  balance?: number; // Raw token balance (not decimals adjusted)
}

interface CloseAccountsResult {
  success: boolean;
  signature?: string;
  error?: string;
  closedCount: number;
  skippedCount?: number;
  closedMints?: string[];
}

export function useCloseAccounts() {
  const { publicKey, signTransaction } = useWallet();
  const [isClosing, setIsClosing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [closedMints, setClosedMints] = useState<Set<string>>(new Set());
  const [reclaimedSOL, setReclaimedSOL] = useState(0);

  const clearClosedMints = useCallback(() => {
    setClosedMints(new Set());
    setReclaimedSOL(0);
  }, []);

  const closeAccounts = useCallback(
    async (tokens: TokenToClose[]): Promise<CloseAccountsResult> => {
      if (!publicKey || !signTransaction) {
        return { success: false, error: 'Wallet not connected', closedCount: 0 };
      }

      if (tokens.length === 0) {
        return { success: false, error: 'No accounts selected', closedCount: 0 };
      }

      setIsClosing(true);
      setStatusMessage(`Checking ${tokens.length} accounts...`);

      try {
        // Get blockhash once for all simulations
        const blockhashResult = await getRecentBlockhash();
        if (!blockhashResult.success || !blockhashResult.data) {
          throw new Error(blockhashResult.error || 'Failed to get blockhash');
        }
        const { blockhash } = blockhashResult.data;

        // Build instructions for each token and simulate in parallel
        const tokenInstructions: Array<{
          token: TokenToClose;
          instructions: TransactionInstruction[];
        }> = [];

        for (const token of tokens) {
          const instructions: TransactionInstruction[] = [];
          const mintPubkey = new PublicKey(token.mint);
          const isToken2022 = token.tokenProgram === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
          const programId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

          const tokenAccountPubkey = getAssociatedTokenAddressSync(
            mintPubkey,
            publicKey,
            false,
            programId
          );

          // Burn if balance exists
          if (token.balance && token.balance > 0) {
            instructions.push(
              createBurnInstruction(
                tokenAccountPubkey,
                mintPubkey,
                publicKey,
                BigInt(token.balance),
                [],
                programId
              )
            );
          }

          // Close the account
          instructions.push(
            createCloseAccountInstruction(tokenAccountPubkey, publicKey, publicKey, [], programId)
          );

          tokenInstructions.push({ token, instructions });
        }

        // Simulate each token's instructions in parallel to find valid ones
        setStatusMessage(`Simulating ${tokens.length} accounts...`);

        const simulationPromises = tokenInstructions.map(async ({ token, instructions }) => {
          const testTx = new Transaction();
          testTx.recentBlockhash = blockhash;
          testTx.feePayer = publicKey;
          instructions.forEach((ix) => testTx.add(ix));

          // Serialize without signature for simulation
          const serialized = testTx
            .serialize({ requireAllSignatures: false, verifySignatures: false })
            .toString('base64');

          const result = await simulateTransaction(serialized);
          return { token, instructions, valid: result.success };
        });

        const simulationResults = await Promise.all(simulationPromises);
        const validTokens = simulationResults.filter((r) => r.valid);
        const skippedCount = simulationResults.length - validTokens.length;

        if (validTokens.length === 0) {
          setIsClosing(false);
          setStatusMessage('');
          return {
            success: false,
            error: 'All accounts are frozen or invalid',
            closedCount: 0,
            skippedCount,
          };
        }

        setStatusMessage(
          `Found ${validTokens.length} closeable accounts${skippedCount > 0 ? ` (${skippedCount} frozen/skipped)` : ''}`
        );

        // Build batches with token tracking
        const MAX_ACCOUNTS_PER_TX = 5;
        const batches: Array<{
          instructions: TransactionInstruction[];
          mints: string[];
        }> = [];

        for (let i = 0; i < validTokens.length; i += MAX_ACCOUNTS_PER_TX) {
          const batchTokens = validTokens.slice(i, i + MAX_ACCOUNTS_PER_TX);
          batches.push({
            instructions: batchTokens.flatMap((r) => r.instructions),
            mints: batchTokens.map((r) => r.token.mint),
          });
        }

        let closedCount = 0;
        let lastSignature: string | undefined;
        let lastError: string | undefined;
        const allClosedMints: string[] = [];

        // Process batches
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          setStatusMessage(
            `Signing batch ${i + 1}/${batches.length} (${batch.mints.length} accounts)...`
          );

          // Get fresh blockhash for this batch
          const freshBlockhash = await getRecentBlockhash();
          if (!freshBlockhash.success || !freshBlockhash.data) {
            throw new Error(freshBlockhash.error || 'Failed to get blockhash');
          }

          const batchTx = new Transaction();
          batchTx.recentBlockhash = freshBlockhash.data.blockhash;
          batchTx.feePayer = publicKey;
          batch.instructions.forEach((ix) => batchTx.add(ix));

          try {
            const signedTx = await signTransaction(batchTx);
            const serialized = signedTx.serialize().toString('base64');

            setStatusMessage(`Sending batch ${i + 1}/${batches.length}...`);
            const sendResult = await sendTxServer(serialized);

            if (sendResult.success) {
              closedCount += batch.mints.length;
              lastSignature = sendResult.signature;
              allClosedMints.push(...batch.mints);

              // Update closed mints in real-time for UI updates
              setClosedMints((prev) => {
                const next = new Set(prev);
                batch.mints.forEach((mint) => next.add(mint));
                return next;
              });
              setReclaimedSOL((prev) => prev + batch.mints.length * 0.00203928);
            } else {
              lastError = sendResult.error;
            }
          } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';
          }
        }

        setIsClosing(false);
        setStatusMessage('');

        if (closedCount > 0) {
          return {
            success: true,
            signature: lastSignature,
            closedCount,
            skippedCount,
            closedMints: allClosedMints,
          };
        } else {
          return {
            success: false,
            error: lastError || 'Failed to close accounts',
            closedCount: 0,
            skippedCount,
          };
        }
      } catch (error) {
        setIsClosing(false);
        setStatusMessage('');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          closedCount: 0,
        };
      }
    },
    [publicKey, signTransaction]
  );

  return {
    closeAccounts,
    isClosing,
    statusMessage,
    closedMints,
    reclaimedSOL,
    clearClosedMints,
  };
}
