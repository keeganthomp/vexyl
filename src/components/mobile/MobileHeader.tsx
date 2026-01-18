'use client';

import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { truncateAddress } from '@/lib/utils';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const { publicKey, connected } = useWallet();

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-4 h-14 relative z-20"
      style={{
        background: 'linear-gradient(180deg, rgba(10, 20, 35, 1) 0%, rgba(10, 20, 35, 0.98) 100%)',
        borderBottom: '1px solid rgba(0, 240, 255, 0.1)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <motion.div
          className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold relative flex-shrink-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(60, 100, 140, 0.2) 100%)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
          }}
        >
          <span className="text-[#00f0ff]">V</span>
        </motion.div>
        <span className="text-sm font-mono text-[#d0d8e0] tracking-wider">VEXYL</span>
      </div>

      {/* Connected Wallet Pill */}
      {connected && publicKey && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(0, 240, 255, 0.08)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]"
            style={{ boxShadow: '0 0 6px #00f0ff' }}
          />
          <span className="text-xs font-mono text-[#00f0ff]">
            {truncateAddress(publicKey.toBase58(), 4)}
          </span>
        </div>
      )}

      {/* Hamburger Menu */}
      <button
        onClick={onMenuClick}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
        aria-label="Open menu"
      >
        <div className="flex flex-col gap-1">
          <div className="w-5 h-0.5 bg-[#8090a0]" />
          <div className="w-5 h-0.5 bg-[#8090a0]" />
          <div className="w-5 h-0.5 bg-[#8090a0]" />
        </div>
      </button>
    </header>
  );
}
