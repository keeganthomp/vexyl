'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore, useWallets } from '@/store/wallet';
import { truncateAddress, copyToClipboard, getSolanaExplorerUrl } from '@/lib/utils';
import type { Wallet } from '@/types';

interface WalletBadgeProps {
  wallet: Wallet;
  isPrimary?: boolean;
  showActions?: boolean;
}

function SingleWalletBadge({ wallet, isPrimary, showActions = true }: WalletBadgeProps) {
  const { removeWallet, setPrimaryWallet, updateWalletLabel } = useWalletStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(wallet.label);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(wallet.address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveLabel = () => {
    if (editLabel.trim()) {
      updateWalletLabel(wallet.address, editLabel.trim());
    }
    setIsEditing(false);
  };

  return (
    <motion.div layout className="group glass-card p-3 flex items-center gap-3">
      {/* Color Indicator */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: wallet.color }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleSaveLabel}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
            className="w-full bg-transparent text-sm font-medium outline-none border-b border-solana-green"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-foreground hover:text-solana-green transition-colors truncate block w-full text-left"
          >
            {wallet.label}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="text-xs font-mono text-foreground-subtle hover:text-foreground transition-colors"
        >
          {copied ? 'Copied!' : truncateAddress(wallet.address)}
        </button>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isPrimary && (
            <button
              onClick={() => setPrimaryWallet(wallet.address)}
              className="p-1.5 rounded-lg hover:bg-glass-hover text-foreground-subtle hover:text-foreground transition-colors"
              title="Set as primary"
            >
              ☆
            </button>
          )}
          <button
            onClick={() => window.open(getSolanaExplorerUrl(wallet.address, 'address'), '_blank')}
            className="p-1.5 rounded-lg hover:bg-glass-hover text-foreground-subtle hover:text-foreground transition-colors"
            title="View on Solscan"
          >
            ↗
          </button>
          <button
            onClick={() => removeWallet(wallet.address)}
            className="p-1.5 rounded-lg hover:bg-accent-coral/20 text-foreground-subtle hover:text-accent-coral transition-colors"
            title="Remove wallet"
          >
            ×
          </button>
        </div>
      )}

      {/* Primary Indicator */}
      {isPrimary && (
        <span className="text-solana-green text-sm" title="Primary wallet">
          ★
        </span>
      )}
    </motion.div>
  );
}

export function WalletCluster() {
  const wallets = useWallets();
  const { primaryWallet } = useWalletStore();
  const [expanded, setExpanded] = useState(false);

  if (wallets.length === 0) {
    return null;
  }

  // Single wallet view
  if (wallets.length === 1) {
    return <SingleWalletBadge wallet={wallets[0]} isPrimary />;
  }

  // Multi-wallet cluster view
  const primaryWalletData = wallets.find((w) => w.address === primaryWallet) || wallets[0];
  const otherWallets = wallets.filter((w) => w.address !== primaryWalletData.address);

  return (
    <div className="space-y-2">
      {/* Primary Wallet (Always Visible) */}
      <SingleWalletBadge wallet={primaryWalletData} isPrimary />

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 text-xs text-foreground-subtle hover:text-foreground transition-colors flex items-center justify-center gap-2"
      >
        <span>
          {expanded ? 'Hide' : 'Show'} {otherWallets.length} more wallet
          {otherWallets.length !== 1 ? 's' : ''}
        </span>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          ▾
        </motion.span>
      </button>

      {/* Other Wallets */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 overflow-hidden"
          >
            {otherWallets.map((wallet) => (
              <SingleWalletBadge key={wallet.address} wallet={wallet} isPrimary={false} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
