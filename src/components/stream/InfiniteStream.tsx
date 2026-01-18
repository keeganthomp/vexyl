'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { TransactionCard, TransactionCardSkeleton } from './TransactionCard';
import { useTimelineTransactions } from '@/hooks/useTimeline';
import { useIsMobile } from '@/hooks/useMediaQuery';

const CARD_HEIGHT = 72;
const CARD_GAP = 8;
const SPINE_WIDTH_DESKTOP = 32;
const SPINE_WIDTH_MOBILE = 16;

// Minimal energy spine - pure CSS, matches our cyberpunk aesthetic
function EnergySpine({
  transactionCount,
  spineWidth,
}: {
  transactionCount: number;
  spineWidth: number;
}) {
  return (
    <div style={{ width: spineWidth }} className="relative h-full flex-shrink-0">
      {/* Main spine line */}
      <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2">
        {/* Core line */}
        <div className="absolute inset-0 w-px bg-gradient-to-b from-transparent via-[#0a1520] to-transparent" />
        {/* Glow */}
        <div className="absolute inset-0 w-px bg-gradient-to-b from-transparent via-[#00f0ff]/10 to-transparent" />
      </div>

      {/* Transaction node markers */}
      {Array.from({ length: Math.min(transactionCount, 40) }).map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: `${60 + i * (CARD_HEIGHT + CARD_GAP)}px` }}
        >
          {/* Outer glow - pulses subtly */}
          <motion.div
            className="absolute -inset-1.5 rounded-full bg-[#00f0ff]/10"
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
          {/* Inner core */}
          <div className="w-1 h-1 rounded-full bg-[#00f0ff]/50" />
        </div>
      ))}

      {/* Traveling pulse - energy moving down the spine */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-0.5 rounded-full pointer-events-none"
        style={{
          height: 40,
          background:
            'linear-gradient(to bottom, transparent, rgba(0, 240, 255, 0.3), transparent)',
        }}
        animate={{
          top: ['0%', '100%'],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

export function InfiniteStream() {
  const { transactions, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useTimelineTransactions();
  const isMobile = useIsMobile();
  const spineWidth = isMobile ? SPINE_WIDTH_MOBILE : SPINE_WIDTH_DESKTOP;

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();

  // Infinite scroll trigger
  const lastItem = items[items.length - 1];
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!lastItem) return;

    // Load more when we're within 5 items of the end
    if (lastItem.index >= transactions.length - 5) {
      loadMore();
    }
  }, [lastItem, transactions.length, loadMore]);

  // Initial loading state
  if (isLoading) {
    return (
      <div className="relative h-full flex-1">
        <div className="absolute inset-0 overflow-hidden">
          <div className="flex">
            {/* Spine Skeleton */}
            <div style={{ width: spineWidth }} className="flex-shrink-0 relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-[#00f0ff]/5 animate-pulse" />
            </div>
            {/* Cards */}
            <div className="flex-1 space-y-3 p-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <TransactionCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#030608] via-[#030608]/90 to-transparent pointer-events-none" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="relative h-full flex-1 flex items-center justify-center">
        <div
          className="p-8 text-center max-w-md rounded relative"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 96, 128, 0.05), transparent)',
            border: '1px solid rgba(255, 96, 128, 0.2)',
          }}
        >
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#ff6080]/30" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#ff6080]/30" />
          <div className="text-[#ff6080] mb-2 text-sm font-mono">ERROR.LOADING.TRANSACTIONS</div>
          <p className="text-xs text-[#506070] font-mono">{error.message}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <div className="relative h-full flex-1 flex items-center justify-center">
        <div
          className="p-8 text-center max-w-md rounded relative"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.02), transparent)',
            border: '1px solid rgba(0, 240, 255, 0.1)',
          }}
        >
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00f0ff]/20" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#00f0ff]/20" />
          <div className="text-2xl mb-4 opacity-30">◇</div>
          <div className="text-[#8090a0] mb-2 text-sm font-mono">NO.TRANSACTIONS.FOUND</div>
          <p className="text-xs text-[#506070] font-mono">This wallet has no transaction history</p>
        </div>
      </div>
    );
  }

  // Calculate total content height including loading skeletons
  const loadingHeight = isFetchingNextPage ? (CARD_HEIGHT + CARD_GAP) * 2 : 0;
  const totalHeight = virtualizer.getTotalSize() + loadingHeight;

  return (
    <div className="relative h-full flex-1">
      {/* Scrollable container */}
      <div ref={parentRef} className="absolute inset-0 overflow-auto hide-scrollbar">
        {/* Container with Spine + Cards layout */}
        <div className="flex" style={{ minHeight: totalHeight + 100 }}>
          {/* Energy Spine */}
          <div
            style={{
              width: spineWidth,
              minHeight: totalHeight + 100,
              position: 'relative',
            }}
          >
            <EnergySpine
              transactionCount={transactions.length + (isFetchingNextPage ? 2 : 0)}
              spineWidth={spineWidth}
            />
          </div>

          {/* Cards column */}
          <div className="flex-1 relative">
            {/* Virtual list container */}
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: 'relative',
              }}
            >
              {items.map((virtualRow) => {
                const transaction = transactions[virtualRow.index];

                return (
                  <div
                    key={transaction.signature}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(virtualRow.index * 0.02, 0.2) }}
                      style={{ paddingBottom: CARD_GAP, paddingRight: 4 }}
                    >
                      <TransactionCard transaction={transaction} index={virtualRow.index} />
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Loading more indicator - flows directly after virtual list */}
            {isFetchingNextPage && (
              <div className="space-y-3" style={{ paddingRight: 4 }}>
                <TransactionCardSkeleton />
                <TransactionCardSkeleton />
              </div>
            )}
          </div>
        </div>

        {/* End of list spacer */}
        {!hasNextPage && transactions.length > 10 && <div className="h-32" />}
      </div>

      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#030608] to-transparent pointer-events-none z-10" />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030608] via-[#030608]/80 to-transparent pointer-events-none z-10" />
    </div>
  );
}
