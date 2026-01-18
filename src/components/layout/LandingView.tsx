'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { GlitchText, Scanlines } from '@/components/visuals';

// Lazy load heavy WebGL component
const HoloDeck = lazy(() =>
  import('@/components/visuals/HoloDeck').then((mod) => ({ default: mod.HoloDeck }))
);

interface LandingViewProps {
  onLaunch: () => void;
}

// Wallet icons
const WALLET_ICONS: Record<string, string> = {
  Phantom:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSJub25lIj48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgZmlsbD0iIzU1MURGRiIgcng9IjY0Ii8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTExMC40IDY0YzAtMjUuNy0yMC44LTQ2LjYtNDYuNC00Ni42UzE3LjYgMzguMyAxNy42IDY0YzAgMjUuNyAyMC44IDQ2LjYgNDYuNCA0Ni42IDcuMiAwIDE0LTEuNiAyMC4xLTQuNWwyLjcgMTEuOWg5LjdsLTQuMi0xOC40YzguNC04LjUgMTguMS0yMC4zIDE4LjEtMzUuNlptLTQ2LjQgMzVjLTE5LjMgMC0zNC44LTE1LjctMzQuOC0zNVM0NC43IDI5IDY0IDI5czM0LjggMTUuNyAzNC44IDM1LTE1LjUgMzUtMzQuOCAzNVoiLz48Y2lyY2xlIGN4PSI1MiIgY3k9IjU4IiByPSI4IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iNzYiIGN5PSI1OCIgcj0iOCIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==',
  Solflare:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjRkY5OTAwIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjRkY1NTAwIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9InVybCgjYSkiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTYgNmwtNiAxMCA2IDRWNnptMCAxNGw2LTQtNi0xMHYxNHoiLz48L3N2Zz4=',
};

export function LandingView({ onLaunch }: LandingViewProps) {
  const { wallets, select, connect, connected, connecting, publicKey } = useWallet();
  const [showWalletList, setShowWalletList] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleWalletSelect = async (walletName: string) => {
    const wallet = wallets.find((w) => w.adapter.name === walletName);
    if (wallet) {
      // Signal that user initiated the connect (for warp animation)
      onLaunch();
      select(wallet.adapter.name);
      setShowWalletList(false);
      try {
        await connect();
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    }
  };

  const installedWallets = wallets.filter((w) => w.readyState === 'Installed');
  const otherWallets = wallets.filter((w) => w.readyState !== 'Installed');

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050a12]">
      {/* WebGL HoloDeck Background */}
      {isMounted && (
        <Suspense fallback={<div className="absolute inset-0" style={{ background: '#050a12' }} />}>
          <HoloDeck className="absolute inset-0">
            {/* Content overlay */}
            <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
              {/* Top HUD elements */}
              <div className="absolute top-6 left-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-1 h-6 bg-gradient-to-b from-[#00f0ff] to-transparent" />
                  <div>
                    <div className="text-[9px] font-mono text-[#506070] tracking-widest">
                      SYSTEM
                    </div>
                    <div className="text-[10px] font-mono text-[#00f0ff]">READY</div>
                  </div>
                </motion.div>
              </div>

              <div className="absolute top-6 right-6">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2"
                >
                  <div className="text-right">
                    <div className="text-[9px] font-mono text-[#506070] tracking-widest">
                      NETWORK
                    </div>
                    <div className="text-[10px] font-mono text-[#00f0ff]">MAINNET</div>
                  </div>
                  <div className="w-1 h-6 bg-gradient-to-b from-transparent to-[#00f0ff]" />
                </motion.div>
              </div>

              {/* Main Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative text-center mb-12 z-10"
              >
                {/* Logo */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="mb-8"
                >
                  <div className="inline-flex items-center gap-4">
                    <motion.div
                      className="w-16 h-16 rounded flex items-center justify-center text-3xl font-bold relative"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(60, 100, 140, 0.2) 100%)',
                        border: '1px solid rgba(0, 240, 255, 0.4)',
                      }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <span className="text-[#00f0ff]">V</span>
                      <div
                        className="absolute inset-0 rounded"
                        style={{ boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)' }}
                      />
                      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00f0ff]/60" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#00f0ff]/60" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-5xl md:text-6xl font-bold mb-4 tracking-tight"
                >
                  <GlitchText className="text-[#00f0ff]" burstInterval={8000} burstDuration={150}>
                    VEXYL
                  </GlitchText>
                </motion.h1>

                {/* Subtitle */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm font-mono text-[#506070] tracking-widest"
                >
                  PORTFOLIO.TIMELINE.INTERFACE
                </motion.div>

                {/* Divider */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="mt-6 h-px w-48 mx-auto bg-gradient-to-r from-transparent via-[#00f0ff]/40 to-transparent"
                />
              </motion.div>

              {/* Connect Wallet Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="relative z-10"
              >
                {/* Main Connect Button */}
                <motion.button
                  onClick={() => setShowWalletList(true)}
                  disabled={connecting}
                  className="group relative px-8 py-4 rounded font-mono text-sm tracking-wider transition-all disabled:opacity-50"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 180, 200, 0.1) 100%)',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                  }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f0ff]/60" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00f0ff]/60" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00f0ff]/60" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00f0ff]/60" />

                  {/* Glow effect */}
                  <div
                    className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background:
                        'radial-gradient(circle at center, rgba(0, 240, 255, 0.1) 0%, transparent 70%)',
                    }}
                  />

                  <span className="relative text-[#00f0ff]">
                    {connecting ? 'CONNECTING...' : 'SIGN IN'}
                  </span>
                </motion.button>

                {/* Wallet List Modal */}
                <AnimatePresence>
                  {showWalletList && (
                    <>
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => setShowWalletList(false)}
                      />

                      {/* Modal */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] z-50 rounded-lg overflow-hidden"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(10, 20, 35, 0.98) 0%, rgba(5, 12, 25, 0.99) 100%)',
                          border: '1px solid rgba(0, 240, 255, 0.2)',
                          boxShadow: '0 0 60px rgba(0, 240, 255, 0.15)',
                        }}
                      >
                        {/* Header */}
                        <div className="p-4 border-b border-[#00f0ff]/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-mono text-[#d0d8e0] tracking-wider">
                                SELECT.WALLET
                              </div>
                              <div className="text-[9px] font-mono text-[#506070] tracking-widest mt-1">
                                CHOOSE.AUTHENTICATION.METHOD
                              </div>
                            </div>
                            <button
                              onClick={() => setShowWalletList(false)}
                              className="text-[#506070] hover:text-[#00f0ff] transition-colors"
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Wallet List */}
                        <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                          {installedWallets.length > 0 && (
                            <>
                              <div className="text-[9px] font-mono text-[#506070] tracking-widest mb-2">
                                DETECTED
                              </div>
                              {installedWallets.map((wallet) => (
                                <WalletButton
                                  key={wallet.adapter.name}
                                  name={wallet.adapter.name}
                                  icon={wallet.adapter.icon}
                                  onClick={() => handleWalletSelect(wallet.adapter.name)}
                                  detected
                                />
                              ))}
                            </>
                          )}

                          {otherWallets.length > 0 && (
                            <>
                              <div className="text-[9px] font-mono text-[#506070] tracking-widest mb-2 mt-4">
                                OTHER.WALLETS
                              </div>
                              {otherWallets.slice(0, 4).map((wallet) => (
                                <WalletButton
                                  key={wallet.adapter.name}
                                  name={wallet.adapter.name}
                                  icon={wallet.adapter.icon}
                                  onClick={() => handleWalletSelect(wallet.adapter.name)}
                                />
                              ))}
                            </>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-[#00f0ff]/10">
                          <div className="text-[9px] font-mono text-[#506070] text-center tracking-wider">
                            NEW.TO.SOLANA? GET.A.WALLET.AT{' '}
                            <a
                              href="https://phantom.app"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#00f0ff] hover:underline"
                            >
                              PHANTOM.APP
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Footer */}
              <motion.footer
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute bottom-6 text-center z-10"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full bg-[#00f0ff]"
                    style={{ boxShadow: '0 0 10px #00f0ff' }}
                  />
                  <span className="text-[9px] font-mono text-[#506070] tracking-widest">
                    POWERED.BY.HELIUS
                  </span>
                </div>
              </motion.footer>

              {/* Bottom corners */}
              <div className="absolute bottom-6 left-6 w-12 h-12 border-l border-b border-[#00f0ff]/20" />
              <div className="absolute bottom-6 right-6 w-12 h-12 border-r border-b border-[#00f0ff]/20" />
            </div>
          </HoloDeck>
        </Suspense>
      )}

      {/* Minimal scanlines */}
      {isMounted && <Scanlines opacity={0.2} />}
    </div>
  );
}

interface WalletButtonProps {
  name: string;
  icon: string;
  onClick: () => void;
  detected?: boolean;
}

function WalletButton({ name, icon, onClick, detected }: WalletButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded text-left transition-all relative group"
      style={{
        background: detected
          ? 'linear-gradient(90deg, rgba(0, 240, 255, 0.08), transparent)'
          : 'rgba(10, 20, 35, 0.4)',
        border: '1px solid rgba(0, 240, 255, 0.1)',
      }}
      whileHover={{
        background: 'rgba(0, 240, 255, 0.1)',
        borderColor: 'rgba(0, 240, 255, 0.3)',
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.05), transparent)',
          borderLeft: '2px solid rgba(0, 240, 255, 0.3)',
        }}
      />

      {/* Icon */}
      <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 relative">
        <img src={icon} alt={name} className="w-full h-full object-cover" />
      </div>

      {/* Name */}
      <div className="flex-1">
        <div className="text-sm font-mono text-[#d0d8e0] tracking-wider">{name.toUpperCase()}</div>
        {detected && (
          <div className="text-[9px] font-mono text-[#00f0ff] tracking-widest">DETECTED</div>
        )}
      </div>

      {/* Arrow */}
      <div className="text-[#506070] group-hover:text-[#00f0ff] transition-colors">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </motion.button>
  );
}
