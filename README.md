# Chronos

A Solana portfolio tracker with a cyberpunk aesthetic. Track your wallets, visualize transaction history, get AI-powered insights, and reclaim SOL from dust accounts.

## Features

- **Multi-Wallet Tracking** - Connect multiple wallets and view unified transaction history
- **Timeline View** - Infinite scroll transaction feed with smart filtering
- **Portfolio Analytics** - Token holdings, NFTs, and value breakdowns
- **AI Insights** - Trading pattern analysis and recommendations powered by Claude/GPT
- **Dust Reclamation** - Close empty token accounts to reclaim rent SOL

## Tech Stack

- Next.js 16 with React 19
- Helius API for Solana RPC and DAS
- Vercel AI SDK (Anthropic Claude / OpenAI)
- TanStack Query for data fetching
- Zustand for state management
- Framer Motion for animations
- Tailwind CSS v4

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (or Node.js 20+)
- [Helius API Key](https://helius.dev)
- Anthropic or OpenAI API key (for AI features)

### Setup

1. Install dependencies:

```bash
bun install
```

2. Create `.env.local` with your API keys:

```bash
HELIUS_API_KEY=your_helius_key
ANTHROPIC_API_KEY=your_anthropic_key  # or OPENAI_API_KEY
```

3. Run the dev server:

```bash
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Scripts

```bash
bun dev        # Start dev server (Turbopack)
bun build      # Production build
bun lint       # ESLint with auto-fix
bun format     # Prettier format all files
bun typecheck  # TypeScript check
```
