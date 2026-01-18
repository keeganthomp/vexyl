'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Prevent body scroll when sheet is open
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

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close if dragged down more than 100px or with velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

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

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-2xl overflow-hidden"
            style={{
              maxHeight: '85vh',
              background:
                'linear-gradient(180deg, rgba(15, 25, 40, 0.98) 0%, rgba(10, 18, 30, 0.99) 100%)',
              borderTop: '1px solid rgba(0, 240, 255, 0.2)',
            }}
          >
            {/* Drag Handle */}
            <div
              className="flex-shrink-0 flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-10 h-1 rounded-full bg-[#506070]" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex-shrink-0 flex items-center justify-between px-4 pb-3 border-b border-[#00f0ff]/10">
                <div className="text-[9px] font-mono text-[#506070] tracking-widest">{title}</div>
                <button
                  onClick={onClose}
                  className="text-[10px] font-mono text-[#506070] hover:text-[#00f0ff] transition-colors tracking-wider"
                >
                  [ CLOSE ]
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

            {/* Safe area padding for bottom */}
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
