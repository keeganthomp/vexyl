import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncate a Solana address for display
 */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format a lamport amount to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1e9;
}

/**
 * Format SOL amount with proper decimals
 */
export function formatSol(amount: number, decimals = 4): string {
  if (amount === 0) return '0';
  if (amount < 0.0001) return '<0.0001';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format USD amount
 */
export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return '<$0.01';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format large numbers with abbreviations
 */
export function formatCompact(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1_000_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  return `${(num / 1_000_000_000).toFixed(1)}B`;
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000; // timestamp is in seconds

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return `${months}mo ago`;
}

/**
 * Format timestamp to date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format timestamp to full date and time
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get transaction type display info
 */
export function getTransactionTypeInfo(type: string): {
  label: string;
  color: string;
  icon: string;
} {
  const types: Record<string, { label: string; color: string; icon: string }> = {
    SWAP: { label: 'Swap', color: 'var(--tx-swap)', icon: '⇄' },
    TRANSFER: { label: 'Transfer', color: 'var(--tx-transfer)', icon: '→' },
    NFT_MINT: { label: 'NFT Mint', color: 'var(--tx-nft-mint)', icon: '✦' },
    NFT_SALE: { label: 'NFT Sale', color: 'var(--tx-nft-sale)', icon: '◈' },
    NFT_LISTING: { label: 'Listed', color: 'var(--tx-nft-sale)', icon: '◇' },
    NFT_BID: { label: 'Bid', color: 'var(--tx-nft-sale)', icon: '◆' },
    NFT_CANCEL_LISTING: { label: 'Delisted', color: 'var(--foreground-subtle)', icon: '✕' },
    BURN: { label: 'Burn', color: 'var(--tx-burn)', icon: '🔥' },
    STAKE: { label: 'Stake', color: 'var(--tx-stake)', icon: '◎' },
    UNSTAKE: { label: 'Unstake', color: 'var(--tx-stake)', icon: '◌' },
    COMPRESSED_NFT_MINT: { label: 'cNFT Mint', color: 'var(--tx-nft-mint)', icon: '✧' },
    UNKNOWN: { label: 'Transaction', color: 'var(--foreground-subtle)', icon: '•' },
  };

  return types[type] || types.UNKNOWN;
}

/**
 * Get source display info
 */
export function getSourceInfo(source: string): {
  label: string;
  color: string;
} {
  const sources: Record<string, { label: string; color: string }> = {
    JUPITER: { label: 'Jupiter', color: '#14F195' },
    RAYDIUM: { label: 'Raydium', color: '#5AC4BE' },
    ORCA: { label: 'Orca', color: '#FFD15C' },
    TENSOR: { label: 'Tensor', color: '#FF6B6B' },
    MAGIC_EDEN: { label: 'Magic Eden', color: '#E42575' },
    PHANTOM: { label: 'Phantom', color: '#AB9FF2' },
    MARINADE: { label: 'Marinade', color: '#60A5FA' },
    UNKNOWN: { label: 'Unknown', color: 'var(--foreground-subtle)' },
  };

  return sources[source] || sources.UNKNOWN;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Orb Markets explorer link
 */
export function getSolanaExplorerUrl(signature: string, type: 'tx' | 'address' = 'tx'): string {
  const base = 'https://orbmarkets.io';
  return type === 'tx' ? `${base}/tx/${signature}` : `${base}/address/${signature}`;
}
