'use client';

import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletStore, useCurrentView } from '@/store/wallet';
import { useAssetStats } from '@/hooks/useAssets';
import { formatSol, formatUsd, formatCompact, truncateAddress } from '@/lib/utils';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { id: 'timeline' as const, label: 'TIMELINE', icon: '◉' },
  { id: 'portfolio' as const, label: 'PORTFOLIO', icon: '◈' },
];

export function Sidebar() {
  const { publicKey, wallet, disconnect, connected } = useWallet();
  const currentView = useCurrentView();
  const { setCurrentView } = useWalletStore();
  const { solBalance, tokenCount, nftCount, totalValueUsd, isLoading } = useAssetStats();

  const walletAddress = publicKey?.toBase58() || '';

  return (
    <motion.aside
      className="w-[260px] h-screen flex flex-col relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(10, 20, 35, 0.95) 0%, rgba(5, 10, 18, 0.98) 100%)',
        borderRight: '1px solid rgba(0, 240, 255, 0.1)',
      }}
    >
      {/* Edge glow */}
      <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-[#00f0ff]/30 via-transparent to-[#00f0ff]/10" />

      {/* Logo Section - Clean header */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-9 h-9 rounded flex items-center justify-center text-base font-bold relative flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(60, 100, 140, 0.2) 100%)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
            }}
          >
            <span className="text-[#00f0ff]">V</span>
            <div className="absolute inset-0 rounded" style={{ boxShadow: '0 0 15px rgba(0, 240, 255, 0.15)' }} />
          </motion.div>
          <div className="min-w-0">
            <div className="text-sm font-mono text-[#d0d8e0] tracking-wider">VEXYL</div>
            <div className="text-[9px] font-mono text-[#506070] tracking-widest">v2.0</div>
          </div>
        </div>
      </div>

      {/* Connected Wallet - Clean display */}
      {connected && publicKey && (
        <div className="px-4 pb-4 flex-shrink-0">
          <div
            className="p-3 rounded relative"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), transparent)',
              border: '1px solid rgba(0, 240, 255, 0.1)',
            }}
          >
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00f0ff]/30" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00f0ff]/30" />

            <div className="flex items-center gap-3">
              {/* Wallet icon */}
              {wallet?.adapter.icon && (
                <img
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  className="w-7 h-7 rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-mono text-[#506070] tracking-widest">
                  CONNECTED
                </div>
                <div className="text-xs font-mono text-[#00f0ff] truncate">
                  {truncateAddress(walletAddress, 4)}
                </div>
              </div>
              {/* Copy button */}
              <button
                onClick={() => navigator.clipboard.writeText(walletAddress)}
                className="text-[#506070] hover:text-[#00f0ff] transition-colors p-1"
                title="Copy address"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#00f0ff]/20 to-transparent flex-shrink-0" />

      {/* Stats Grid */}
      {connected && (
        <div className="p-4 flex-shrink-0">
          <div className="text-[9px] font-mono text-[#506070] tracking-widest mb-3">
            PORTFOLIO.METRICS
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="SOL" value={isLoading ? null : formatSol(solBalance)} color="#14f195" />
            <MetricCard label="USD" value={isLoading ? null : formatUsd(totalValueUsd)} color="#00f0ff" />
            <MetricCard label="TOKENS" value={isLoading ? null : String(tokenCount)} color="#00f0ff" />
            <MetricCard label="NFTS" value={isLoading ? null : String(nftCount)} color="#9945ff" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 min-h-0">
        <div className="text-[9px] font-mono text-[#506070] tracking-widest mb-3">
          NAVIGATION
        </div>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-mono transition-all relative',
                currentView === item.id
                  ? 'text-[#00f0ff]'
                  : 'text-[#8090a0] hover:text-[#d0d8e0]'
              )}
              style={{
                background: currentView === item.id
                  ? 'linear-gradient(90deg, rgba(0, 240, 255, 0.1), transparent)'
                  : 'transparent',
              }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active indicator */}
              {currentView === item.id && (
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#00f0ff]"
                  layoutId="sidebar-indicator"
                  style={{ boxShadow: '0 0 10px #00f0ff' }}
                />
              )}

              <span className="text-base opacity-60">{item.icon}</span>
              <span className="tracking-wider">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#00f0ff]/10 flex-shrink-0">
        {connected && (
          <motion.button
            onClick={() => disconnect()}
            className="w-full py-2.5 text-xs font-mono text-[#ff6080] tracking-wider rounded relative group"
            style={{
              background: 'linear-gradient(90deg, rgba(255, 96, 128, 0.1), transparent)',
              border: '1px solid rgba(255, 96, 128, 0.3)',
            }}
            whileHover={{
              borderColor: 'rgba(255, 96, 128, 0.6)',
              boxShadow: '0 0 20px rgba(255, 96, 128, 0.2)',
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff6080]/40" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff6080]/40" />
            DISCONNECT
          </motion.button>
        )}
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" style={{ boxShadow: '0 0 6px #00f0ff' }} />
          <span className="text-[9px] font-mono text-[#506070] tracking-wider">
            HELIUS.MAINNET
          </span>
        </div>
      </div>
    </motion.aside>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | null; color: string }) {
  return (
    <div
      className="p-2 rounded relative"
      style={{
        background: 'rgba(10, 20, 35, 0.4)',
        border: '1px solid rgba(0, 240, 255, 0.08)',
      }}
    >
      <div className="text-[9px] font-mono text-[#506070] tracking-wider">
        {label}
      </div>
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
