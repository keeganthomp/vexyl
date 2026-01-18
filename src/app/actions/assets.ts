'use server';

import { dasCall } from '@/lib/helius';
import { ensurePubkey } from './wallet';
import type { AssetsResponse, DASAsset, PortfolioAssets, Wallet } from '@/types';

interface DASResponse {
  total: number;
  limit: number;
  page: number;
  items: DASAsset[];
  nativeBalance?: {
    lamports: number;
    price_per_sol?: number;
    total_price?: number;
  };
}

/**
 * Fetch fungible tokens for a wallet (smaller response)
 */
async function fetchWalletTokens(address: string): Promise<{
  items: DASAsset[];
  nativeBalance?: DASResponse['nativeBalance'];
}> {
  const pubkey = await ensurePubkey(address);

  try {
    const response = await dasCall<DASResponse>('getAssetsByOwner', {
      ownerAddress: pubkey,
      page: 1,
      limit: 50,
      displayOptions: {
        showFungible: true,
        showNativeBalance: true,
        showCollectionMetadata: false,
        showUnverifiedCollections: false,
        showGrandTotal: false,
      },
      sortBy: { sortBy: 'recent_action', sortDirection: 'desc' },
    });

    // Filter to only fungible tokens
    const tokens = response.items.filter(
      (item) =>
        item.interface === 'FungibleToken' ||
        item.interface === 'FungibleAsset' ||
        (item.token_info && item.token_info.decimals > 0)
    );

    return {
      items: tokens,
      nativeBalance: response.nativeBalance,
    };
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return { items: [] };
  }
}

/**
 * Fetch NFTs for a wallet with pagination
 */
async function fetchWalletNFTs(
  address: string,
  options: { maxPages?: number } = {}
): Promise<DASAsset[]> {
  const { maxPages = 2 } = options;
  const pubkey = await ensurePubkey(address);

  const allNFTs: DASAsset[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    try {
      const response = await dasCall<DASResponse>('getAssetsByOwner', {
        ownerAddress: pubkey,
        page,
        limit: 20, // Very small limit for NFTs (they have more metadata)
        displayOptions: {
          showFungible: false, // Only NFTs
          showNativeBalance: false,
          showCollectionMetadata: false,
          showUnverifiedCollections: false,
        },
      });

      // Filter to only non-fungible assets
      const nfts = response.items.filter(
        (item) =>
          item.interface !== 'FungibleToken' &&
          item.interface !== 'FungibleAsset' &&
          !(item.token_info && item.token_info.decimals > 0)
      );

      allNFTs.push(...nfts);
      hasMore = response.items.length === 20;
      page++;
    } catch (error) {
      console.error(`Error fetching NFTs page ${page}:`, error);
      break;
    }
  }

  return allNFTs;
}

/**
 * Fetch all assets for a single wallet using DAS API
 */
async function fetchWalletAssets(address: string): Promise<DASResponse> {
  // Fetch tokens and NFTs separately to avoid response size issues
  const [tokenResult, nfts] = await Promise.all([
    fetchWalletTokens(address),
    fetchWalletNFTs(address),
  ]);

  return {
    total: tokenResult.items.length + nfts.length,
    limit: 100,
    page: 1,
    items: [...tokenResult.items, ...nfts],
    nativeBalance: tokenResult.nativeBalance,
  };
}

/**
 * Categorize assets into tokens and NFTs
 */
function categorizeAssets(items: DASAsset[]): {
  tokens: DASAsset[];
  nfts: DASAsset[];
} {
  const tokens: DASAsset[] = [];
  const nfts: DASAsset[] = [];

  for (const item of items) {
    // Fungible tokens have token_info with decimals > 0 or are explicitly fungible
    const isFungible =
      item.interface === 'FungibleToken' ||
      item.interface === 'FungibleAsset' ||
      (item.token_info && item.token_info.decimals > 0);

    if (isFungible) {
      tokens.push(item);
    } else {
      nfts.push(item);
    }
  }

  // Sort tokens by total value
  tokens.sort((a, b) => {
    const aValue = a.token_info?.price_info?.total_price || 0;
    const bValue = b.token_info?.price_info?.total_price || 0;
    return bValue - aValue;
  });

  return { tokens, nfts };
}

/**
 * Fetch portfolio assets for a single wallet
 */
export async function getAssets(address: string): Promise<AssetsResponse> {
  try {
    // fetchWalletAssets already resolves .sol domains via ensurePubkey
    const response = await fetchWalletAssets(address);
    const { tokens, nfts } = categorizeAssets(response.items);

    return {
      success: true,
      data: {
        nativeBalance: response.nativeBalance || { lamports: 0 },
        tokens,
        nfts,
      },
    };
  } catch (error) {
    console.error('Assets fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch assets',
    };
  }
}

/**
 * Fetch and merge assets from multiple wallets
 */
export async function getClusterAssets(wallets: Wallet[]): Promise<AssetsResponse> {
  try {
    // Fetch all wallets in parallel
    const results = await Promise.all(wallets.map((wallet) => fetchWalletAssets(wallet.address)));

    // Aggregate native balance
    const totalNativeBalance = results.reduce(
      (acc, result) => {
        const balance = result.nativeBalance || { lamports: 0 };
        return {
          lamports: acc.lamports + balance.lamports,
          price_per_sol: balance.price_per_sol || acc.price_per_sol,
          total_price: (acc.total_price || 0) + (balance.total_price || 0),
        };
      },
      { lamports: 0, price_per_sol: undefined, total_price: 0 } as PortfolioAssets['nativeBalance']
    );

    // Merge all assets
    const allItems = results.flatMap((r) => r.items);

    // Aggregate fungible tokens by mint address
    const tokenMap = new Map<string, DASAsset>();
    const nfts: DASAsset[] = [];

    for (const item of allItems) {
      const isFungible =
        item.interface === 'FungibleToken' ||
        item.interface === 'FungibleAsset' ||
        (item.token_info && item.token_info.decimals > 0);

      if (isFungible) {
        const existing = tokenMap.get(item.id);
        if (existing && existing.token_info && item.token_info) {
          // Aggregate balance
          existing.token_info.balance += item.token_info.balance;
          if (existing.token_info.price_info && item.token_info.price_info) {
            existing.token_info.price_info.total_price += item.token_info.price_info.total_price;
          }
        } else {
          tokenMap.set(item.id, { ...item });
        }
      } else {
        nfts.push(item);
      }
    }

    const tokens = Array.from(tokenMap.values()).sort((a, b) => {
      const aValue = a.token_info?.price_info?.total_price || 0;
      const bValue = b.token_info?.price_info?.total_price || 0;
      return bValue - aValue;
    });

    return {
      success: true,
      data: {
        nativeBalance: totalNativeBalance,
        tokens,
        nfts,
      },
    };
  } catch (error) {
    console.error('Cluster assets fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cluster assets',
    };
  }
}

/**
 * Search for assets by name or collection
 */
export async function searchAssets(
  query: string,
  options: {
    ownerAddress?: string;
    collection?: string;
    page?: number;
  } = {}
): Promise<{ success: boolean; data?: DASAsset[]; error?: string }> {
  try {
    const params: Record<string, unknown> = {
      page: options.page || 1,
      limit: 100,
    };

    if (options.ownerAddress) {
      // Resolve .sol domains if needed
      params.ownerAddress = await ensurePubkey(options.ownerAddress);
    }

    if (options.collection) {
      params.grouping = ['collection', options.collection];
    }

    // Search by name
    if (query) {
      params.searchTerm = query;
    }

    const response = await dasCall<DASResponse>('searchAssets', params);

    return {
      success: true,
      data: response.items,
    };
  } catch (error) {
    console.error('Asset search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * Get detailed info for a specific asset
 */
export async function getAssetDetails(
  assetId: string
): Promise<{ success: boolean; data?: DASAsset; error?: string }> {
  try {
    const asset = await dasCall<DASAsset>('getAsset', {
      id: assetId,
      displayOptions: {
        showFungible: true,
        showCollectionMetadata: true,
      },
    });

    return {
      success: true,
      data: asset,
    };
  } catch (error) {
    console.error('Asset details error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch asset details',
    };
  }
}

/**
 * Calculate total portfolio value
 */
export async function getPortfolioValue(wallets: Wallet[]): Promise<{
  success: boolean;
  data?: { totalUsd: number; breakdown: Record<string, number> };
  error?: string;
}> {
  const assetsResult = await getClusterAssets(wallets);

  if (!assetsResult.success || !assetsResult.data) {
    return { success: false, error: assetsResult.error };
  }

  const { nativeBalance, tokens } = assetsResult.data;

  // SOL value
  const solValue = nativeBalance.total_price || 0;

  // Token values
  let tokenValue = 0;
  for (const token of tokens) {
    tokenValue += token.token_info?.price_info?.total_price || 0;
  }

  return {
    success: true,
    data: {
      totalUsd: solValue + tokenValue,
      breakdown: {
        SOL: solValue,
        tokens: tokenValue,
      },
    },
  };
}
