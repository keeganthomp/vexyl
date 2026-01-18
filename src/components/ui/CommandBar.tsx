'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveWallet } from '@/app/actions/wallet';
import { useWalletStore } from '@/store/wallet';
import { cn, truncateAddress } from '@/lib/utils';

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

interface CommandBarProps {
  layoutId?: string;
  variant?: 'landing' | 'compact';
  onLaunch?: () => void;
}

export function CommandBar({
  layoutId = 'command-bar',
  variant = 'landing',
  onLaunch,
}: CommandBarProps) {
  const [input, setInput] = useState('');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { addWallet, setWarpComplete, wallets } = useWalletStore();

  // Auto-focus on mount
  useEffect(() => {
    if (variant === 'landing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [variant]);

  // Debounced validation
  const validateInput = useCallback(async (value: string) => {
    if (!value.trim()) {
      setValidationState('idle');
      setErrorMessage(null);
      setResolvedAddress(null);
      return;
    }

    setValidationState('validating');
    setErrorMessage(null);

    try {
      const result = await resolveWallet(value);

      if (result.valid && result.address) {
        setValidationState('valid');
        setResolvedAddress(result.address);
        setErrorMessage(null);
      } else {
        setValidationState('invalid');
        setErrorMessage(result.error || 'Invalid address');
        setResolvedAddress(null);
      }
    } catch {
      setValidationState('invalid');
      setErrorMessage('Failed to validate address');
      setResolvedAddress(null);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // Debounce validation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      validateInput(value);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validationState !== 'valid' || !resolvedAddress) {
      return;
    }

    // Check for duplicate
    if (wallets.some((w) => w.address === resolvedAddress)) {
      setErrorMessage('Wallet already added');
      return;
    }

    // Add wallet and trigger warp
    const label = input.endsWith('.sol') ? input : undefined;
    addWallet(resolvedAddress, label);
    setWarpComplete(true);
    onLaunch?.();

    // Reset input
    setInput('');
    setValidationState('idle');
    setResolvedAddress(null);
  };

  const isLanding = variant === 'landing';

  return (
    <motion.div
      layoutId={layoutId}
      className={cn('layout-animation', isLanding ? 'w-full max-w-[600px]' : 'w-full')}
    >
      <form onSubmit={handleSubmit}>
        <div
          className="relative rounded transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.03), transparent)',
            border: `1px solid ${
              validationState === 'valid'
                ? 'rgba(0, 240, 255, 0.4)'
                : validationState === 'invalid'
                  ? 'rgba(255, 96, 128, 0.4)'
                  : 'rgba(0, 240, 255, 0.15)'
            }`,
            boxShadow:
              validationState === 'valid'
                ? '0 0 20px rgba(0, 240, 255, 0.15)'
                : 'none',
          }}
        >
          {/* Corner accents */}
          <div
            className="absolute top-0 left-0 w-3 h-3 border-t border-l transition-colors"
            style={{
              borderColor:
                validationState === 'valid'
                  ? 'rgba(0, 240, 255, 0.6)'
                  : validationState === 'invalid'
                    ? 'rgba(255, 96, 128, 0.4)'
                    : 'rgba(0, 240, 255, 0.3)',
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-3 h-3 border-b border-r transition-colors"
            style={{
              borderColor:
                validationState === 'valid'
                  ? 'rgba(0, 240, 255, 0.6)'
                  : validationState === 'invalid'
                    ? 'rgba(255, 96, 128, 0.4)'
                    : 'rgba(0, 240, 255, 0.3)',
            }}
          />

          <div
            className={cn(
              'flex items-center gap-3',
              isLanding ? 'px-5 py-4' : 'px-3 py-2'
            )}
          >
            {/* Status Indicator */}
            <div className="flex-shrink-0">
              <AnimatePresence mode="wait">
                {validationState === 'idle' && (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-[#506070] text-sm"
                  >
                    ◎
                  </motion.span>
                )}
                {validationState === 'validating' && (
                  <motion.span
                    key="validating"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1, rotate: 360 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ rotate: { duration: 1, repeat: Infinity, ease: 'linear' } }}
                    className="text-[#8090a0] text-sm"
                  >
                    ◐
                  </motion.span>
                )}
                {validationState === 'valid' && (
                  <motion.span
                    key="valid"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-[#00f0ff] text-sm"
                  >
                    ●
                  </motion.span>
                )}
                {validationState === 'invalid' && (
                  <motion.span
                    key="invalid"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-[#ff6080] text-sm"
                  >
                    ○
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder={isLanding ? 'ENTER.WALLET.ADDRESS' : 'ADD.WALLET'}
              className={cn(
                'flex-1 bg-transparent outline-none font-mono placeholder:text-[#506070]',
                isLanding ? 'text-base text-[#d0d8e0]' : 'text-sm text-[#8090a0]'
              )}
              style={{ caretColor: '#00f0ff' }}
              spellCheck={false}
              autoComplete="off"
            />

            {/* Resolved Address Preview */}
            {resolvedAddress && input.endsWith('.sol') && (
              <span className="text-[10px] font-mono text-[#506070] tracking-wider">
                {truncateAddress(resolvedAddress)}
              </span>
            )}

            {/* Submit Hint */}
            {validationState === 'valid' && isLanding && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] font-mono text-[#00f0ff] tracking-wider"
              >
                ENTER ↵
              </motion.span>
            )}

            {/* Compact submit button */}
            {!isLanding && validationState === 'valid' && (
              <button
                type="submit"
                className="px-3 py-1 rounded text-[10px] font-mono tracking-wider transition-colors"
                style={{
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  color: '#00f0ff',
                }}
              >
                [ ADD ]
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Error Message */}
      <AnimatePresence>
        {errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-[10px] font-mono text-[#ff6080] text-center tracking-wider"
          >
            ERROR: {errorMessage.toUpperCase()}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
