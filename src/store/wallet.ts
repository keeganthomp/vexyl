import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParsedTransaction, Wallet } from '@/types';

// Predefined colors for wallet badges
const WALLET_COLORS = [
  '#14F195', // Solana Green
  '#9945FF', // Solana Purple
  '#00D1FF', // Cyan
  '#FF6B6B', // Coral
  '#FFE66D', // Yellow
  '#4ECDC4', // Teal
  '#FF8C42', // Orange
  '#A8E6CF', // Mint
];

interface WalletState {
  // Wallet cluster
  wallets: Wallet[];
  primaryWallet: string | null;

  // UI State
  isWarpComplete: boolean;
  hoveredTransaction: ParsedTransaction | null;
  selectedTransaction: ParsedTransaction | null;
  selectedTimeRange: [number, number] | null;

  // View state
  currentView: 'timeline' | 'portfolio';
  sidebarCollapsed: boolean;

  // Actions
  addWallet: (address: string, label?: string) => void;
  removeWallet: (address: string) => void;
  updateWalletLabel: (address: string, label: string) => void;
  setPrimaryWallet: (address: string) => void;
  clearWallets: () => void;

  // UI Actions
  setWarpComplete: (complete: boolean) => void;
  setHoveredTransaction: (tx: ParsedTransaction | null) => void;
  setSelectedTransaction: (tx: ParsedTransaction | null) => void;
  setSelectedTimeRange: (range: [number, number] | null) => void;
  setCurrentView: (view: 'timeline' | 'portfolio') => void;
  toggleSidebar: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      wallets: [],
      primaryWallet: null,
      isWarpComplete: false,
      hoveredTransaction: null,
      selectedTransaction: null,
      selectedTimeRange: null,
      currentView: 'timeline',
      sidebarCollapsed: false,

      // Wallet management
      addWallet: (address: string, label?: string) => {
        const { wallets } = get();

        // Don't add duplicates
        if (wallets.some((w) => w.address === address)) {
          return;
        }

        const colorIndex = wallets.length % WALLET_COLORS.length;
        const newWallet: Wallet = {
          address,
          label: label || `Wallet ${wallets.length + 1}`,
          color: WALLET_COLORS[colorIndex],
        };

        set((state) => ({
          wallets: [...state.wallets, newWallet],
          primaryWallet: state.primaryWallet || address,
        }));
      },

      removeWallet: (address: string) => {
        set((state) => {
          const newWallets = state.wallets.filter((w) => w.address !== address);
          const newPrimary =
            state.primaryWallet === address ? newWallets[0]?.address || null : state.primaryWallet;

          return {
            wallets: newWallets,
            primaryWallet: newPrimary,
            // Reset warp if no wallets left
            isWarpComplete: newWallets.length > 0 ? state.isWarpComplete : false,
          };
        });
      },

      updateWalletLabel: (address: string, label: string) => {
        set((state) => ({
          wallets: state.wallets.map((w) => (w.address === address ? { ...w, label } : w)),
        }));
      },

      setPrimaryWallet: (address: string) => {
        set({ primaryWallet: address });
      },

      clearWallets: () => {
        set({
          wallets: [],
          primaryWallet: null,
          isWarpComplete: false,
        });
      },

      // UI state management
      setWarpComplete: (complete: boolean) => {
        set({ isWarpComplete: complete });
      },

      setHoveredTransaction: (tx: ParsedTransaction | null) => {
        set({ hoveredTransaction: tx });
      },

      setSelectedTransaction: (tx: ParsedTransaction | null) => {
        set({ selectedTransaction: tx });
      },

      setSelectedTimeRange: (range: [number, number] | null) => {
        set({ selectedTimeRange: range });
      },

      setCurrentView: (view: 'timeline' | 'portfolio') => {
        set({ currentView: view });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
    }),
    {
      name: 'vexyl-wallet-storage',
      // Only persist wallet data, not UI state
      partialize: (state) => ({
        wallets: state.wallets,
        primaryWallet: state.primaryWallet,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useWallets = () => useWalletStore((state) => state.wallets);
export const usePrimaryWallet = () => useWalletStore((state) => state.primaryWallet);
export const useIsWarpComplete = () => useWalletStore((state) => state.isWarpComplete);
export const useHoveredTransaction = () => useWalletStore((state) => state.hoveredTransaction);
export const useSelectedTransaction = () => useWalletStore((state) => state.selectedTransaction);
export const useCurrentView = () => useWalletStore((state) => state.currentView);
