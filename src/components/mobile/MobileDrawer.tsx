'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAssetStats } from '@/hooks/useAssets';
import {
  formatSol,
  formatUsd,
  truncateAddress,
  copyToClipboard,
  getSolanaExplorerUrl,
} from '@/lib/utils';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { publicKey, wallet, disconnect, connected } = useWallet();
  const { solBalance, tokenCount, nftCount, totalValueUsd, isLoading } = useAssetStats();

  const walletAddress = publicKey?.toBase58() || '';

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 flex flex-col overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, rgba(10, 20, 35, 0.98) 0%, rgba(5, 10, 18, 0.99) 100%)',
              borderRight: '1px solid rgba(0, 240, 255, 0.15)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#00f0ff]/10">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(60, 100, 140, 0.2) 100%)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                  }}
                >
                  <span className="text-[#00f0ff]">V</span>
                </div>
                <div>
                  <div className="text-sm font-mono text-[#d0d8e0] tracking-wider">VEXYL</div>
                  <div className="text-[9px] font-mono text-[#506070] tracking-widest">v2.0</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#506070] hover:text-[#00f0ff]"
                aria-label="Close menu"
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            {/* Connected Wallet */}
            {connected && publicKey && (
              <div className="p-4 border-b border-[#00f0ff]/10">
                <div
                  className="p-3 rounded relative"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), transparent)',
                    border: '1px solid rgba(0, 240, 255, 0.1)',
                  }}
                >
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00f0ff]/30" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00f0ff]/30" />

                  <div className="flex items-center gap-3">
                    {wallet?.adapter.icon && (
                      <img
                        src={wallet.adapter.icon}
                        alt={wallet.adapter.name}
                        className="w-8 h-8 rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-mono text-[#506070] tracking-widest">
                        CONNECTED
                      </div>
                      <div className="text-xs font-mono text-[#00f0ff] truncate">
                        {truncateAddress(walletAddress, 6)}
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => copyToClipboard(walletAddress)}
                      className="flex-1 py-2 text-[10px] font-mono text-[#506070] hover:text-[#00f0ff] transition-colors rounded"
                      style={{ background: 'rgba(0, 240, 255, 0.05)' }}
                    >
                      Copy
                    </button>
                    <button
                      onClick={() =>
                        window.open(getSolanaExplorerUrl(walletAddress, 'address'), '_blank')
                      }
                      className="flex-1 py-2 text-[10px] font-mono text-[#506070] hover:text-[#00f0ff] transition-colors rounded"
                      style={{ background: 'rgba(0, 240, 255, 0.05)' }}
                    >
                      Explorer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            {connected && (
              <div className="p-4 border-b border-[#00f0ff]/10">
                <div className="text-[9px] font-mono text-[#506070] tracking-widest mb-3">
                  PORTFOLIO.METRICS
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard
                    label="SOL"
                    value={isLoading ? null : formatSol(solBalance)}
                    color="#14f195"
                  />
                  <MetricCard
                    label="USD"
                    value={isLoading ? null : formatUsd(totalValueUsd)}
                    color="#00f0ff"
                  />
                  <MetricCard
                    label="TOKENS"
                    value={isLoading ? null : String(tokenCount)}
                    color="#00f0ff"
                  />
                  <MetricCard
                    label="NFTS"
                    value={isLoading ? null : String(nftCount)}
                    color="#9945ff"
                  />
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Footer */}
            <div className="p-4 border-t border-[#00f0ff]/10">
              {connected && (
                <button
                  onClick={() => {
                    disconnect();
                    onClose();
                  }}
                  className="w-full py-3 text-xs font-mono text-[#ff6080] tracking-wider rounded relative min-h-[44px]"
                  style={{
                    background: 'linear-gradient(90deg, rgba(255, 96, 128, 0.1), transparent)',
                    border: '1px solid rgba(255, 96, 128, 0.3)',
                  }}
                >
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff6080]/40" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff6080]/40" />
                  DISCONNECT
                </button>
              )}
              <div className="mt-3 flex items-center justify-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]"
                  style={{ boxShadow: '0 0 6px #00f0ff' }}
                />
                <span className="text-[9px] font-mono text-[#506070] tracking-wider">
                  HELIUS.MAINNET
                </span>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | null;
  color: string;
}) {
  return (
    <div
      className="p-2 rounded relative"
      style={{
        background: 'rgba(10, 20, 35, 0.4)',
        border: '1px solid rgba(0, 240, 255, 0.08)',
      }}
    >
      <div className="text-[9px] font-mono text-[#506070] tracking-wider">{label}</div>
      <div className="text-xs font-mono mt-0.5" style={{ color }}>
        {value === null ? (
          <span className="inline-block w-8 h-3 rounded bg-[#00f0ff]/10 animate-pulse" />
        ) : (
          value
        )}
      </div>
    </div>
  );
}
