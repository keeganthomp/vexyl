'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  analyzeTransactions,
  getTransactionInsight,
  analyzePortfolio,
  suggestWalletLabel,
  type TransactionAnalysis,
} from '@/app/actions/analyze';
import type { ParsedTransaction } from '@/types';

/**
 * Analyze a batch of transactions
 */
export function useTransactionAnalysis(
  transactions: ParsedTransaction[],
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['analysis', transactions.map((t) => t.signature).join(',')],
    queryFn: async () => {
      const result = await analyzeTransactions(transactions);
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }
      return result.data as TransactionAnalysis;
    },
    enabled: enabled && transactions.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}

/**
 * Get a quick insight for a single transaction
 */
export function useTransactionInsight(
  transaction: ParsedTransaction | null,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['insight', transaction?.signature],
    queryFn: async () => {
      if (!transaction) throw new Error('No transaction');
      const result = await getTransactionInsight(transaction);
      if (!result.success) {
        throw new Error(result.error || 'Insight failed');
      }
      return result.data as string;
    },
    enabled: enabled && !!transaction,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1,
  });
}

interface AnalyzeParams {
  transactions: ParsedTransaction[];
  portfolio?: {
    holdings: Array<{
      symbol: string;
      name?: string;
      balance: number;
      valueUsd: number;
      percentOfPortfolio: number;
    }>;
    totalValueUsd: number;
    solBalance: number;
  };
}

/**
 * Mutation for on-demand wallet analysis (transactions + portfolio)
 */
export function useAnalyzeTransactionsMutation() {
  return useMutation({
    mutationFn: async (params: AnalyzeParams) => {
      const result = await analyzeTransactions(params.transactions, params.portfolio);
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }
      return result.data as TransactionAnalysis;
    },
  });
}

/**
 * Analyze portfolio holdings
 */
export function usePortfolioAnalysis(
  holdings: Array<{ symbol: string; balance: number; valueUsd: number }>,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['portfolio-analysis', holdings.map((h) => h.symbol).join(',')],
    queryFn: async () => {
      const result = await analyzePortfolio(holdings);
      if (!result.success) {
        throw new Error(result.error || 'Portfolio analysis failed');
      }
      return result.data!;
    },
    enabled: enabled && holdings.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Suggest a wallet label based on activity
 */
export function useWalletLabelSuggestion(
  transactions: ParsedTransaction[],
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: [
      'wallet-label',
      transactions
        .slice(0, 20)
        .map((t) => t.signature)
        .join(','),
    ],
    queryFn: async () => {
      const result = await suggestWalletLabel(transactions);
      if (!result.success) {
        throw new Error(result.error || 'Label suggestion failed');
      }
      return result.data as string;
    },
    enabled: enabled && transactions.length >= 5,
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    retry: 1,
  });
}
