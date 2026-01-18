'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletStore } from '@/store/wallet';
import { LandingView } from '@/components/layout/LandingView';
import { Dashboard } from '@/components/layout/Dashboard';
import { WarpTransition, Scanlines } from '@/components/visuals';

type AppState = 'landing' | 'warping' | 'dashboard';

export function VexylApp() {
  const { connected, publicKey } = useWallet();
  const { addWallet, clearWallets } = useWalletStore();
  const [appState, setAppState] = useState<AppState>('landing');
  const userInitiatedConnect = useRef(false);
  const prevConnected = useRef<boolean | null>(null);

  // Handle connection state changes
  useEffect(() => {
    const wasConnected = prevConnected.current;
    prevConnected.current = connected;

    if (connected && publicKey) {
      // Sync wallet to store
      addWallet(publicKey.toBase58());

      // Determine how to transition
      if (wasConnected === null || wasConnected === false) {
        if (userInitiatedConnect.current) {
          // User clicked connect - play warp animation
          userInitiatedConnect.current = false;
          setAppState('warping');
        } else {
          // Auto-connected (page load with remembered wallet) - skip warp
          setAppState('dashboard');
        }
      }
    } else if (!connected && wasConnected === true) {
      // Disconnected - return to landing
      clearWallets();
      setAppState('landing');
    }
  }, [connected, publicKey, addWallet, clearWallets]);

  // Called when user clicks connect button (before wallet connects)
  const handleLaunch = useCallback(() => {
    userInitiatedConnect.current = true;
  }, []);

  const handleWarpComplete = useCallback(() => {
    setAppState('dashboard');
  }, []);

  return (
    <LayoutGroup>
      {/* Warp Transition Overlay */}
      <WarpTransition
        isActive={appState === 'warping'}
        onComplete={handleWarpComplete}
        duration={800}
      />

      <AnimatePresence mode="wait">
        {appState === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 1.1,
              filter: 'blur(10px)',
              transition: { duration: 0.4, ease: 'easeIn' },
            }}
          >
            <LandingView onLaunch={handleLaunch} />
          </motion.div>
        ) : appState === 'warping' ? (
          <motion.div
            key="warping"
            className="min-h-screen bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
              delay: 0.1,
            }}
          >
            <Dashboard />
            <Scanlines opacity={0.3} />
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
