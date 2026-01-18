'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { getTimeline } from '@/app/actions/timeline';
import { useWallets } from '@/store/wallet';
import type { ParsedTransaction, Wallet } from '@/types';

interface UseTimelineOptions {
  enabled?: boolean;
  limit?: number;
}

export function useTimeline(options: UseTimelineOptions = {}) {
  const { enabled = true, limit = 50 } = options;
  const wallets = useWallets();

  return useInfiniteQuery({
    queryKey: ['timeline', wallets.map((w) => w.address), limit],
    queryFn: async ({ pageParam }) => {
      const result = await getTimeline(wallets, {
        limit,
        cursor: pageParam,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch timeline');
      }

      return {
        transactions: result.data || [],
        nextCursor: result.nextCursor,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && wallets.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Flattened transactions selector
export function useTimelineTransactions(): {
  transactions: ParsedTransaction[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
} {
  const query = useTimeline();

  const transactions = query.data?.pages.flatMap((page) => page.transactions) || [];

  return {
    transactions,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage || false,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
  };
}

// Hook for fetching timeline for specific wallets (not from store)
export function useWalletTimeline(wallets: Wallet[], options: UseTimelineOptions = {}) {
  const { enabled = true, limit = 50 } = options;

  return useInfiniteQuery({
    queryKey: ['timeline', wallets.map((w) => w.address), limit],
    queryFn: async ({ pageParam }) => {
      const result = await getTimeline(wallets, {
        limit,
        cursor: pageParam,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch timeline');
      }

      return {
        transactions: result.data || [],
        nextCursor: result.nextCursor,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && wallets.length > 0,
  });
}
