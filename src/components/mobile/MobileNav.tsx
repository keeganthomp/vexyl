'use client';

import { motion } from 'framer-motion';
import { useCurrentView, useWalletStore } from '@/store/wallet';
import { cn } from '@/lib/utils';

type ViewType = 'timeline' | 'portfolio';

const NAV_ITEMS: { id: ViewType; label: string; icon: string }[] = [
  { id: 'timeline', label: 'Timeline', icon: '◉' },
  { id: 'portfolio', label: 'Portfolio', icon: '◈' },
];

export function MobileNav() {
  const currentView = useCurrentView();
  const { setCurrentView } = useWalletStore();

  return (
    <nav
      className="flex-shrink-0 flex items-stretch relative z-20"
      style={{
        background: 'linear-gradient(180deg, rgba(10, 20, 35, 0.98) 0%, rgba(10, 20, 35, 1) 100%)',
        borderTop: '1px solid rgba(0, 240, 255, 0.1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-3 relative',
              'min-h-[56px] transition-colors',
              isActive ? 'text-[#00f0ff]' : 'text-[#506070]'
            )}
          >
            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-[#00f0ff]"
                style={{ boxShadow: '0 0 10px #00f0ff' }}
              />
            )}

            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px] font-mono tracking-wider">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
