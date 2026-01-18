'use client';

import { useQuery } from '@tanstack/react-query';
import { getAssets, getClusterAssets, getPortfolioValue } from '@/app/actions/assets';
import { getFrozenTokenMints } from '@/app/actions/rpc';
import { useWallets } from '@/store/wallet';
import type { Wallet } from '@/types';

interface UseAssetsOptions {
  enabled?: boolean;
}

/**
 * Fetch aggregated assets for all wallets in the store
 */
export function useClusterAssets(options: UseAssetsOptions = {}) {
  const { enabled = true } = options;
  const wallets = useWallets();

  return useQuery({
    queryKey: ['cluster-assets', wallets.map((w) => w.address)],
    queryFn: async () => {
      const result = await getClusterAssets(wallets);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch assets');
      }

      return result.data!;
    },
    enabled: enabled && wallets.length > 0,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch assets for a single wallet
 */
export function useSingleWalletAssets(address: string | null, options: UseAssetsOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['assets', address],
    queryFn: async () => {
      if (!address) throw new Error('No address provided');

      const result = await getAssets(address);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch assets');
      }

      return result.data!;
    },
    enabled: enabled && !!address,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch assets for specific wallets (not from store)
 */
export function useWalletAssets(wallets: Wallet[], options: UseAssetsOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['assets', wallets.map((w) => w.address)],
    queryFn: async () => {
      const result = await getClusterAssets(wallets);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch assets');
      }

      return result.data!;
    },
    enabled: enabled && wallets.length > 0,
    staleTime: 60 * 1000,
  });
}

/**
 * Get total portfolio value in USD
 */
export function usePortfolioValue(options: UseAssetsOptions = {}) {
  const { enabled = true } = options;
  const wallets = useWallets();

  return useQuery({
    queryKey: ['portfolio-value', wallets.map((w) => w.address)],
    queryFn: async () => {
      const result = await getPortfolioValue(wallets);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch portfolio value');
      }

      return result.data!;
    },
    enabled: enabled && wallets.length > 0,
    staleTime: 30 * 1000, // 30 seconds for price updates
  });
}

/**
 * Derived hook for commonly needed asset stats
 */
export function useAssetStats() {
  const { data: assets, isLoading } = useClusterAssets();
  const { data: value } = usePortfolioValue();

  if (isLoading || !assets) {
    return {
      isLoading,
      solBalance: 0,
      tokenCount: 0,
      nftCount: 0,
      totalValueUsd: 0,
    };
  }

  return {
    isLoading: false,
    solBalance: assets.nativeBalance.lamports / 1e9,
    tokenCount: assets.tokens.length,
    nftCount: assets.nfts.length,
    totalValueUsd: value?.totalUsd || 0,
  };
}

/**
 * Fetch frozen token mints for all wallets
 * These accounts cannot be closed
 */
export function useFrozenMints(options: UseAssetsOptions = {}) {
  const { enabled = true } = options;
  const wallets = useWallets();

  return useQuery({
    queryKey: ['frozen-mints', wallets.map((w) => w.address)],
    queryFn: async () => {
      // Fetch frozen mints for all wallets in parallel
      const results = await Promise.all(
        wallets.map((w) => getFrozenTokenMints(w.address))
      );

      // Combine all frozen mints into a Set
      const allFrozen = new Set<string>();
      for (const result of results) {
        if (result.success && result.data) {
          result.data.forEach((mint) => allFrozen.add(mint));
        }
      }

      return allFrozen;
    },
    enabled: enabled && wallets.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - frozen status rarely changes
  });
}
