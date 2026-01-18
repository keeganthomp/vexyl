'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/store/wallet';
import {
  cn,
  truncateAddress,
  formatRelativeTime,
  formatSol,
  lamportsToSol,
  getTransactionTypeInfo,
  getSolanaExplorerUrl,
  copyToClipboard,
} from '@/lib/utils';
import type { ParsedTransaction } from '@/types';
import { useState, useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface TransactionCardProps {
  transaction: ParsedTransaction;
  style?: React.CSSProperties;
  index?: number;
}

// Generate a simple, human-readable summary
function getSimpleSummary(tx: ParsedTransaction): { action: string; detail: string } {
  const type = tx.type;

  // Handle swaps
  if (type === 'SWAP') {
    const tokenIn = tx.tokenTransfers.find((t) => t.tokenAmount < 0);
    const tokenOut = tx.tokenTransfers.find((t) => t.tokenAmount > 0);
    if (tokenIn && tokenOut) {
      return {
        action: 'Swapped',
        detail: `${tokenIn.symbol || 'token'} → ${tokenOut.symbol || 'token'}`,
      };
    }
    return { action: 'Swapped', detail: 'tokens' };
  }

  // Handle transfers
  if (type === 'TRANSFER') {
    const netSol = tx.nativeTransfers.reduce((acc, t) => {
      if (t.toUserAccount === tx.feePayer) return acc + t.amount;
      if (t.fromUserAccount === tx.feePayer) return acc - t.amount;
      return acc;
    }, 0);

    if (netSol > 0) {
      return { action: 'Received', detail: `${formatSol(lamportsToSol(netSol))} SOL` };
    } else if (netSol < 0) {
      return { action: 'Sent', detail: `${formatSol(lamportsToSol(Math.abs(netSol)))} SOL` };
    }

    if (tx.tokenTransfers.length > 0) {
      const transfer = tx.tokenTransfers[0];
      const sym = transfer.symbol || 'tokens';
      if (transfer.tokenAmount > 0) {
        return { action: 'Received', detail: sym };
      }
      return { action: 'Sent', detail: sym };
    }

    return { action: 'Transfer', detail: '' };
  }

  // Handle NFT operations
  if (type === 'NFT_MINT') {
    return { action: 'Minted', detail: 'NFT' };
  }
  if (type === 'NFT_SALE' || type === 'NFT_LISTING') {
    return { action: 'NFT Sale', detail: '' };
  }
  if (type === 'NFT_BID') {
    return { action: 'NFT Bid', detail: '' };
  }
  if (type === 'NFT_CANCEL_LISTING') {
    return { action: 'Cancelled', detail: 'listing' };
  }

  // Handle staking
  if (type === 'STAKE') {
    return { action: 'Staked', detail: 'SOL' };
  }
  if (type === 'UNSTAKE') {
    return { action: 'Unstaked', detail: '' };
  }

  // Handle burns
  if (type === 'BURN') {
    return { action: 'Burned', detail: tx.tokenTransfers[0]?.symbol || '' };
  }

  // Compressed NFT
  if (type === 'COMPRESSED_NFT_MINT') {
    return { action: 'Minted', detail: 'cNFT' };
  }

  // Default fallback
  const typeInfo = getTransactionTypeInfo(type);
  return { action: typeInfo.label, detail: '' };
}

export function TransactionCard({ transaction, style, index = 0 }: TransactionCardProps) {
  const { setHoveredTransaction, setSelectedTransaction } = useWalletStore();
  const [copied, setCopied] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const isMobile = useIsMobile();

  const typeInfo = getTransactionTypeInfo(transaction.type);

  // Simple summary for quick scanning
  const summary = useMemo(() => getSimpleSummary(transaction), [transaction]);

  // Calculate net SOL change
  const netSolChange = useMemo(() => {
    return transaction.nativeTransfers.reduce((acc, t) => {
      if (t.toUserAccount === transaction.feePayer) return acc + t.amount;
      if (t.fromUserAccount === transaction.feePayer) return acc - t.amount;
      return acc;
    }, 0);
  }, [transaction]);

  // Trigger "new" effect
  useEffect(() => {
    if (index === 0) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [transaction.signature, index]);

  const handleCopySignature = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(transaction.signature);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenExplorer = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(getSolanaExplorerUrl(transaction.signature), '_blank');
  };

  return (
    <motion.div
      style={style}
      className="relative cursor-pointer group"
      onMouseEnter={() => setHoveredTransaction(transaction)}
      onMouseLeave={() => setHoveredTransaction(null)}
      onClick={() => setSelectedTransaction(transaction)}
      whileHover={{ x: 2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Card container */}
      <div
        className="relative p-3 rounded transition-all duration-200"
        style={{
          background: 'rgba(10, 20, 35, 0.4)',
          border: '1px solid rgba(0, 240, 255, 0.06)',
        }}
      >
        {/* Hover highlight */}
        <div
          className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.08), transparent)',
            borderLeft: '2px solid rgba(0, 240, 255, 0.3)',
          }}
        />

        {/* New transaction indicator */}
        <AnimatePresence>
          {isNew && (
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-[#00f0ff]"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ opacity: 0 }}
              style={{ boxShadow: '0 0 8px #00f0ff' }}
            />
          )}
        </AnimatePresence>

        {/* Main layout: Icon | Content | Value */}
        <div className="relative flex items-center gap-3">
          {/* Type Icon */}
          <div
            className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 text-base"
            style={{
              background: `${typeInfo.color}15`,
              color: typeInfo.color,
            }}
          >
            {typeInfo.icon}
          </div>

          {/* Center content */}
          <div className="flex-1 min-w-0">
            {/* Action + Detail */}
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-[#d0d8e0]">{summary.action}</span>
              {summary.detail && (
                <span className="text-xs text-[#506070] truncate">{summary.detail}</span>
              )}
            </div>

            {/* Secondary info row */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-[#3a4a5a]">
                {formatRelativeTime(transaction.timestamp)}
              </span>
              {transaction.source !== 'UNKNOWN' && (
                <>
                  <span className="text-[#3a4a5a]">·</span>
                  <span className="text-[10px] text-[#3a4a5a]">
                    {transaction.source.toLowerCase()}
                  </span>
                </>
              )}
              {/* Action buttons - always visible on mobile, hover on desktop */}
              <button
                onClick={handleCopySignature}
                className={cn(
                  'text-[10px] text-[#3a4a5a] hover:text-[#00f0ff] transition-colors',
                  'min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center',
                  !isMobile && 'opacity-0 group-hover:opacity-100'
                )}
              >
                {copied ? '✓' : truncateAddress(transaction.signature, 4)}
              </button>
              <button
                onClick={handleOpenExplorer}
                className={cn(
                  'text-[10px] text-[#3a4a5a] hover:text-[#00f0ff] transition-colors',
                  'min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center',
                  !isMobile && 'opacity-0 group-hover:opacity-100'
                )}
              >
                ↗
              </button>
            </div>
          </div>

          {/* Right side: Value */}
          <div className="flex flex-col items-end flex-shrink-0">
            {netSolChange !== 0 ? (
              <span
                className={cn(
                  'text-sm font-mono font-medium',
                  netSolChange > 0 ? 'text-[#00f0ff]' : 'text-[#ff6080]'
                )}
              >
                {netSolChange > 0 ? '+' : ''}
                {formatSol(lamportsToSol(netSolChange))}
              </span>
            ) : transaction.tokenTransfers.length > 0 ? (
              <span className="text-sm font-mono text-[#5090c0]">
                {transaction.tokenTransfers.length} token
                {transaction.tokenTransfers.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs text-[#3a4a5a]">—</span>
            )}

            {/* Wallet indicator */}
            {transaction.walletColor && (
              <div
                className="w-1.5 h-1.5 rounded-full mt-1"
                style={{ background: transaction.walletColor }}
                title={transaction.walletLabel}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Skeleton for loading state
export function TransactionCardSkeleton() {
  return (
    <div
      className="p-3 rounded"
      style={{
        background: 'rgba(10, 20, 35, 0.4)',
        border: '1px solid rgba(0, 240, 255, 0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Icon skeleton */}
        <div className="w-9 h-9 rounded bg-[#0a1520] animate-pulse" />

        {/* Content skeleton */}
        <div className="flex-1">
          <div className="h-4 w-24 rounded bg-[#0a1520] animate-pulse mb-1" />
          <div className="h-3 w-16 rounded bg-[#0a1520] animate-pulse" />
        </div>

        {/* Value skeleton */}
        <div className="h-4 w-16 rounded bg-[#0a1520] animate-pulse" />
      </div>
    </div>
  );
}
