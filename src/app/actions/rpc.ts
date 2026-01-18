'use server';

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

/**
 * Get recent blockhash from server (keeps API key private)
 */
export async function getRecentBlockhash(): Promise<{
  success: boolean;
  data?: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
  error?: string;
}> {
  try {
    const connection = new Connection(HELIUS_RPC_URL, 'confirmed');
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    return {
      success: true,
      data: {
        blockhash,
        lastValidBlockHeight,
      },
    };
  } catch (error) {
    console.error('Failed to get blockhash:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get blockhash',
    };
  }
}

/**
 * Simulate a transaction to check if it would succeed
 * Used to pre-filter accounts before batching
 */
export async function simulateTransaction(
  serializedTransaction: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const connection = new Connection(HELIUS_RPC_URL, 'confirmed');
    const buffer = Buffer.from(serializedTransaction, 'base64');

    // Deserialize the transaction
    const transaction = Transaction.from(buffer);

    // Get fresh blockhash for simulation
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Compile to message for simulation (skips signature verification)
    const message = transaction.compileMessage();

    const result = await connection.simulateTransaction(message);

    if (result.value.err) {
      console.log('Simulation error:', result.value.err, result.value.logs);
      return {
        success: false,
        error: JSON.stringify(result.value.err),
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Simulation exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Simulation failed',
    };
  }
}

/**
 * Get frozen token mints for a wallet
 * Returns set of mint addresses that are frozen and cannot be closed
 */
export async function getFrozenTokenMints(
  ownerAddress: string
): Promise<{
  success: boolean;
  data?: string[];
  error?: string;
}> {
  try {
    const connection = new Connection(HELIUS_RPC_URL, 'confirmed');
    const owner = new PublicKey(ownerAddress);

    // Fetch from both token programs
    const [tokenAccounts, token2022Accounts] = await Promise.all([
      connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
      connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }),
    ]);

    const frozenMints: string[] = [];

    // Check regular token accounts
    for (const { account } of tokenAccounts.value) {
      const parsed = account.data.parsed;
      if (parsed?.info?.state === 'frozen') {
        frozenMints.push(parsed.info.mint);
      }
    }

    // Check Token-2022 accounts
    for (const { account } of token2022Accounts.value) {
      const parsed = account.data.parsed;
      if (parsed?.info?.state === 'frozen') {
        frozenMints.push(parsed.info.mint);
      }
    }

    return {
      success: true,
      data: frozenMints,
    };
  } catch (error) {
    console.error('Failed to get frozen tokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get frozen tokens',
    };
  }
}

/**
 * Send a signed transaction from server (keeps API key private)
 */
export async function sendTransaction(
  serializedTransaction: string
): Promise<{
  success: boolean;
  signature?: string;
  error?: string;
}> {
  try {
    const connection = new Connection(HELIUS_RPC_URL, 'confirmed');

    // Deserialize and send
    const buffer = Buffer.from(serializedTransaction, 'base64');
    const signature = await connection.sendRawTransaction(buffer, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Wait for confirmation
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    return {
      success: true,
      signature,
    };
  } catch (error) {
    console.error('Failed to send transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send transaction',
    };
  }
}
