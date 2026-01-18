'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useCurrentView, useSelectedTransaction, useWalletStore } from '@/store/wallet';
import { Sidebar } from './Sidebar';
import { InfiniteStream } from '@/components/stream/InfiniteStream';
import { IntelPanel } from './IntelPanel';
import { PortfolioView } from '@/components/portfolio/PortfolioView';
import { MobileHeader, MobileNav, MobileDrawer, BottomSheet } from '@/components/mobile';
import { useIsMobile } from '@/hooks/useMediaQuery';

// Lazy load heavy WebGL
const HoloDeck = lazy(() =>
  import('@/components/visuals/HoloDeck').then((mod) => ({ default: mod.HoloDeck }))
);

export function Dashboard() {
  const isMobile = useIsMobile();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show loading state during SSR
  if (!isMounted) {
    return (
      <div className="h-screen w-screen overflow-hidden relative">
        <div className="absolute inset-0" style={{ background: '#050a12' }} />
      </div>
    );
  }

  return isMobile ? <MobileDashboard /> : <DesktopDashboard />;
}

// Mobile Dashboard Layout
function MobileDashboard() {
  const currentView = useCurrentView();
  const selectedTransaction = useSelectedTransaction();
  const { setSelectedTransaction } = useWalletStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <Suspense fallback={<div className="h-screen w-screen" style={{ background: '#050a12' }} />}>
      <HoloDeck className="h-screen w-screen">
        {/* Mobile layout container */}
        <div className="h-full w-full flex flex-col">
          {/* Mobile Header */}
          <MobileHeader onMenuClick={() => setIsDrawerOpen(true)} />

          {/* Main Content - flex-1 takes remaining space */}
          <main className="flex-1 min-h-0 overflow-hidden relative">
            <motion.div
              key={currentView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
            >
              {currentView === 'timeline' && <MobileTimelineView />}
              {currentView === 'portfolio' && <MobilePortfolioView />}
            </motion.div>
          </main>

          {/* Mobile Bottom Nav */}
          <MobileNav />
        </div>

        {/* Mobile Drawer (Sidebar replacement) */}
        <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

        {/* Bottom Sheet for Transaction Details (Intel Panel replacement) */}
        <BottomSheet
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          title="INTEL.MODULE"
        >
          {selectedTransaction && <MobileIntelContent />}
        </BottomSheet>
      </HoloDeck>
    </Suspense>
  );
}

// Mobile Timeline View (simplified header)
function MobileTimelineView() {
  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#030608' }}>
      {/* Simplified Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
        <span className="text-[#00f0ff] text-xs font-mono tracking-widest">TIMELINE</span>
        <div className="flex-1 h-px bg-gradient-to-r from-[#00f0ff]/20 to-transparent" />
        <motion.div
          className="flex items-center gap-1.5"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" />
          <span className="text-[10px] font-mono text-[#506070]">LIVE</span>
        </motion.div>
      </div>

      {/* Timeline Content - flex-1 with relative for absolute child */}
      <div className="flex-1 min-h-0 relative">
        <InfiniteStream />
      </div>
    </div>
  );
}

// Mobile Portfolio View (scrollable wrapper)
function MobilePortfolioView() {
  return (
    <div className="h-full overflow-y-auto">
      <PortfolioView />
    </div>
  );
}

// Mobile Intel Content (shown in bottom sheet)
function MobileIntelContent() {
  // The IntelPanel component handles its own content display
  // We'll render a simplified version for mobile
  return <IntelPanel />;
}

// Desktop Dashboard Layout (original)
function DesktopDashboard() {
  const currentView = useCurrentView();

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <Suspense fallback={<div className="absolute inset-0" style={{ background: '#050a12' }} />}>
        <HoloDeck className="absolute inset-0">
          {/* UI Layer - Floating panels */}
          <div className="flex h-full">
            {/* Left Panel - Sidebar */}
            <motion.div
              initial={{ x: -300, opacity: 0, rotateY: 15 }}
              animate={{ x: 0, opacity: 1, rotateY: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              style={{ perspective: '1000px' }}
            >
              <Sidebar />
            </motion.div>

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden relative">
              {/* Primary View */}
              <div className="flex-1 flex flex-col min-h-0">
                <motion.div
                  key={currentView}
                  initial={{ opacity: 0, z: -50, scale: 0.95 }}
                  animate={{ opacity: 1, z: 0, scale: 1 }}
                  exit={{ opacity: 0, z: 50, scale: 1.05 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 flex flex-col min-h-0"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {currentView === 'timeline' && <TimelineView />}
                  {currentView === 'portfolio' && <PortfolioView />}
                </motion.div>
              </div>

              {/* Right Panel - Intel */}
              <motion.div
                initial={{ x: 300, opacity: 0, rotateY: -15 }}
                animate={{ x: 0, opacity: 1, rotateY: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.1 }}
                style={{ perspective: '1000px' }}
              >
                <IntelPanel />
              </motion.div>
            </main>
          </div>
        </HoloDeck>
      </Suspense>

      {/* HUD Overlay Elements */}
      <HUDOverlay />
    </div>
  );
}

function TimelineView() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6" style={{ backgroundColor: '#030608' }}>
      {/* Header with HUD styling */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6 flex-shrink-0"
      >
        <div className="hud-corners relative px-4 py-2">
          <span className="text-[#00f0ff] text-xs font-mono tracking-widest">SYS.TIMELINE</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[#00f0ff]/30 via-[#00f0ff]/10 to-transparent" />
        <motion.div
          className="flex items-center gap-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-2 h-2 rounded-full bg-[#00f0ff]" />
          <span className="text-xs font-mono text-[#506070]">LIVE</span>
        </motion.div>
      </motion.div>

      {/* Timeline Content */}
      <div className="flex-1 min-h-0 relative">
        {/* Holographic frame */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-16 h-16 border-l border-t border-[#00f0ff]/20" />
          <div className="absolute top-0 right-0 w-16 h-16 border-r border-t border-[#00f0ff]/20" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-l border-b border-[#00f0ff]/20" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-r border-b border-[#00f0ff]/20" />
        </div>

        <InfiniteStream />
      </div>
    </div>
  );
}

function HUDOverlay() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Top right - Time */}
      <div className="absolute top-4 right-4">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2"
        >
          <div className="text-right">
            <div className="text-[10px] font-mono text-[#506070]">SYS.TIME</div>
            <div className="text-sm font-mono text-[#8090a0]">{time}</div>
          </div>
          <div className="w-1 h-8 bg-gradient-to-b from-transparent to-[#00f0ff]" />
        </motion.div>
      </div>

      {/* Bottom right corner */}
      <div className="absolute bottom-4 right-4">
        <div className="w-8 h-8 border-r border-b border-[#00f0ff]/30" />
      </div>

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00f0ff]/20 to-transparent"
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
