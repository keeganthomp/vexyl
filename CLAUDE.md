# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VEXYL is a Solana portfolio tracker with a cyberpunk aesthetic, built with Next.js 16 and React 19. It provides timeline-based transaction history, portfolio analytics, AI-powered insights, and dust account reclamation.

## Commands

```bash
bun dev          # Start dev server with Turbopack (port 3000)
bun build        # Production build
bun lint         # ESLint with auto-fix
bun lint:check   # ESLint without auto-fix
bun format       # Prettier format
bun typecheck    # TypeScript type checking
```

## Architecture

### Server Actions (`src/app/actions/`)
All blockchain API calls run server-side to protect the Helius API key:
- `timeline.ts` - Fetches and merges transaction history from multiple wallets using Helius Enhanced Transactions API
- `assets.ts` - Fetches portfolio assets (tokens, NFTs) using Helius DAS API
- `analyze.ts` - AI analysis using Vercel AI SDK (Anthropic Claude or OpenAI fallback)
- `wallet.ts` - Wallet validation and .sol domain resolution
- `rpc.ts` - RPC helpers for blockhash, transaction sending/simulation

### Client Hooks (`src/hooks/`)
React Query-based data fetching that calls server actions:
- `useTimeline.ts` - Infinite scroll timeline with cursor-based pagination
- `useAssets.ts` - Portfolio assets with React Query caching
- `useAnalysis.ts` - AI analysis trigger
- `useCloseAccounts.ts` - Dust account closing (burn + close token accounts)

### State Management
- Zustand store (`src/store/wallet.ts`) manages wallet cluster, UI state, and persists wallet addresses to localStorage
- React Query handles server state caching

### Wallet Integration
- Uses `@solana/wallet-adapter-react` for wallet connection (Phantom, Solflare)
- Public RPC for wallet adapter signing only
- All RPC calls (blockhash, send) route through server actions to use Helius RPC

### Key Data Flow
1. User connects wallet → `VexylApp.tsx` detects connection → adds to Zustand store
2. Store update triggers `useTimeline` → calls `getTimeline` server action
3. Server action uses `fetchParsedTransactions` from `lib/helius.ts` → returns merged, deduplicated transactions
4. Transactions from multiple wallets are merged and self-transfers are detected

## Environment Variables

Required in `.env.local`:
- `HELIUS_API_KEY` - Helius API key for Solana RPC and DAS
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` - For AI analysis features

## Key Patterns

- Path alias: `@/*` maps to `./src/*`
- All components use `'use client'` directive except server actions which use `'use server'`
- Visual components in `src/components/visuals/` are heavy on Framer Motion animations
- Transaction types and DAS asset types are defined in `src/types/index.ts`
