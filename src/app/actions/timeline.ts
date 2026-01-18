'use server';

import { fetchParsedTransactions } from '@/lib/helius';
import { ensurePubkey } from './wallet';
import type { ParsedTransaction, TimelineResponse, Wallet } from '@/types';

interface HeliusEnhancedTransaction {
  signature: string;
  type: string;
  source: string;
  description: string;
  fee: number;
  feePayer: string;
  slot: number;
  timestamp: number;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  events?: {
    nft?: unknown;
    swap?: unknown;
  };
}

/**
 * Fetch transaction history for a single wallet using Enhanced Transactions API
 */
async function fetchWalletHistory(
  address: string,
  options: {
    limit?: number;
    before?: string;
  } = {}
): Promise<HeliusEnhancedTransaction[]> {
  const { limit = 100, before } = options;

  try {
    // Ensure address is a valid pubkey (resolve .sol domains)
    const pubkey = await ensurePubkey(address);

    const transactions = await fetchParsedTransactions(pubkey, {
      limit,
      before,
    });

    return transactions as HeliusEnhancedTransaction[];
  } catch (error) {
    console.error(`Failed to fetch history for ${address}:`, error);
    return [];
  }
}

/**
 * Merge and deduplicate transactions from multiple wallets
 */
function mergeTransactions(
  results: Array<{ wallet: Wallet; transactions: HeliusEnhancedTransaction[] }>
): ParsedTransaction[] {
  const signatureMap = new Map<string, ParsedTransaction>();

  for (const { wallet, transactions } of results) {
    for (const tx of transactions) {
      const existing = signatureMap.get(tx.signature);

      if (existing) {
        // Same transaction seen from another wallet = self-transfer
        existing.isSelfTransfer = true;
      } else {
        // Convert to our ParsedTransaction format
        const parsed: ParsedTransaction = {
          signature: tx.signature,
          type: (tx.type || 'UNKNOWN') as ParsedTransaction['type'],
          source: (tx.source || 'UNKNOWN') as ParsedTransaction['source'],
          description: tx.description || '',
          fee: tx.fee || 0,
          feePayer: tx.feePayer || '',
          slot: tx.slot || 0,
          timestamp: tx.timestamp || 0,
          blockTime: tx.timestamp || 0,
          nativeTransfers: tx.nativeTransfers || [],
          tokenTransfers: (tx.tokenTransfers || []).map((t) => ({
            ...t,
            symbol: undefined,
            decimals: undefined,
            imageUri: undefined,
          })),
          events: {
            nft: tx.events?.nft as ParsedTransaction['events']['nft'],
            swap: tx.events?.swap as ParsedTransaction['events']['swap'],
          },
          isSelfTransfer: false,
          walletLabel: wallet.label,
          walletColor: wallet.color,
        };

        signatureMap.set(tx.signature, parsed);
      }
    }
  }

  // Sort by timestamp descending (newest first)
  return Array.from(signatureMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Fetch merged timeline for multiple wallets
 * This is the main endpoint used by the UI
 */
export async function getTimeline(
  wallets: Wallet[],
  options: {
    limit?: number;
    cursor?: string;
  } = {}
): Promise<TimelineResponse> {
  const { limit = 50, cursor } = options;

  try {
    // Fetch all wallets in parallel (50 RPS allows this)
    const results = await Promise.all(
      wallets.map(async (wallet) => ({
        wallet,
        transactions: await fetchWalletHistory(wallet.address, {
          limit: Math.ceil(limit / wallets.length) + 10, // Fetch extra to account for deduplication
          before: cursor,
        }),
      }))
    );

    // Merge and deduplicate
    const merged = mergeTransactions(results);

    // Trim to requested limit
    const trimmed = merged.slice(0, limit);

    // Next cursor is the signature of the last transaction
    const nextCursor = trimmed.length > 0 ? trimmed[trimmed.length - 1].signature : undefined;

    return {
      success: true,
      data: trimmed,
      nextCursor,
    };
  } catch (error) {
    console.error('Timeline fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch timeline',
    };
  }
}

/**
 * Fetch transactions for a specific time range
 * Used for the "Time Travel" graph feature
 */
export async function getTimelineByRange(
  wallets: Wallet[],
  startTime: number,
  endTime: number
): Promise<TimelineResponse> {
  try {
    // Fetch recent transactions and filter by time
    // Note: Helius doesn't support direct time filtering, so we fetch and filter
    const results = await Promise.all(
      wallets.map(async (wallet) => ({
        wallet,
        transactions: await fetchWalletHistory(wallet.address, {
          limit: 500, // Fetch more to cover the time range
        }),
      }))
    );

    // Merge and filter by time range
    const merged = mergeTransactions(results);
    const filtered = merged.filter((tx) => tx.timestamp >= startTime && tx.timestamp <= endTime);

    return {
      success: true,
      data: filtered,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch timeline range',
    };
  }
}

/**
 * Get a single transaction by signature with full details
 */
export async function getTransactionDetails(
  signature: string
): Promise<{ success: boolean; data?: ParsedTransaction; error?: string }> {
  try {
    // Use the Helius Enhanced API to parse a single transaction
    const response = await fetch(
      `https://api.helius.xyz/v0/transactions/?api-key=${process.env.HELIUS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: [signature] }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch transaction: ${response.statusText}`);
    }

    const transactions = await response.json();

    if (!transactions || transactions.length === 0) {
      return {
        success: false,
        error: 'Transaction not found',
      };
    }

    const tx = transactions[0] as HeliusEnhancedTransaction;

    const parsed: ParsedTransaction = {
      signature: tx.signature,
      type: (tx.type || 'UNKNOWN') as ParsedTransaction['type'],
      source: (tx.source || 'UNKNOWN') as ParsedTransaction['source'],
      description: tx.description || '',
      fee: tx.fee || 0,
      feePayer: tx.feePayer || '',
      slot: tx.slot || 0,
      timestamp: tx.timestamp || 0,
      blockTime: tx.timestamp || 0,
      nativeTransfers: tx.nativeTransfers || [],
      tokenTransfers: (tx.tokenTransfers || []).map((t) => ({
        ...t,
        symbol: undefined,
        decimals: undefined,
        imageUri: undefined,
      })),
      events: {
        nft: tx.events?.nft as ParsedTransaction['events']['nft'],
        swap: tx.events?.swap as ParsedTransaction['events']['swap'],
      },
    };

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transaction',
    };
  }
}
