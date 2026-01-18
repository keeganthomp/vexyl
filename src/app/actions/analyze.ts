'use server';

import { generateText, generateObject, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { ParsedTransaction } from '@/types';

// Use Anthropic by default, fallback to OpenAI
function getModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic('claude-opus-4-5');
  }
  if (process.env.OPENAI_API_KEY) {
    return openai('gpt-4o-mini');
  }
  throw new Error('No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
}

// Portfolio holding for analysis
interface PortfolioHolding {
  symbol: string;
  name?: string;
  balance: number;
  valueUsd: number;
  percentOfPortfolio: number;
}

// Schema for comprehensive wallet analysis
const WalletAnalysisSchema = z.object({
  // Transaction insights
  tradingInsights: z
    .array(z.string())
    .describe('3-5 observations about trading patterns and behavior'),

  // Portfolio analysis
  portfolioAnalysis: z.object({
    health: z
      .enum(['poor', 'fair', 'good', 'excellent'])
      .describe('Overall portfolio health assessment'),
    concentration: z
      .enum(['highly_concentrated', 'concentrated', 'balanced', 'diversified'])
      .describe('How diversified the portfolio is'),
    issues: z.array(z.string()).describe('1-3 issues with current portfolio composition'),
  }),

  // Growth recommendations
  growthStrategy: z.object({
    approach: z
      .enum(['accumulate', 'rebalance', 'take_profits', 'reduce_risk', 'explore_new'])
      .describe('Recommended primary strategy'),
    actions: z.array(z.string()).describe('2-4 specific actions to grow portfolio'),
  }),

  // Market opportunities
  opportunities: z
    .array(
      z.object({
        category: z
          .enum([
            'defi',
            'memecoin',
            'infrastructure',
            'gaming',
            'ai',
            'rwa',
            'stablecoin',
            'other',
          ])
          .describe('Category of opportunity'),
        suggestion: z.string().describe('Specific opportunity or narrative to explore'),
      })
    )
    .describe('2-4 market opportunities based on their style and current trends'),

  // Warnings
  warnings: z.array(z.string()).describe('Up to 3 red flags or concerns (empty if none)'),

  // Overall summary
  summary: z.string().describe('2-3 sentence overall assessment and key takeaway'),
});

export type WalletAnalysis = z.infer<typeof WalletAnalysisSchema>;

// Keep old type for backwards compat
export type TransactionAnalysis = WalletAnalysis;

/**
 * Analyze transactions and portfolio together
 */
export async function analyzeTransactions(
  transactions: ParsedTransaction[],
  portfolio?: {
    holdings: PortfolioHolding[];
    totalValueUsd: number;
    solBalance: number;
  }
): Promise<{ success: boolean; data?: WalletAnalysis; error?: string }> {
  try {
    const model = getModel();

    // Prepare transaction summary
    const txSummary = transactions.map((tx) => ({
      type: tx.type,
      source: tx.source,
      description: tx.description,
      timestamp: new Date(tx.timestamp * 1000).toISOString(),
      solChange:
        tx.nativeTransfers.reduce((acc, t) => {
          if (t.toUserAccount === tx.feePayer) return acc + t.amount;
          if (t.fromUserAccount === tx.feePayer) return acc - t.amount;
          return acc;
        }, 0) / 1e9,
      tokenCount: tx.tokenTransfers.length,
      isSelfTransfer: tx.isSelfTransfer,
    }));

    // Prepare portfolio summary
    const portfolioSummary = portfolio
      ? `
## CURRENT PORTFOLIO ($${portfolio.totalValueUsd.toFixed(2)} total)

SOL Balance: ${portfolio.solBalance.toFixed(4)} SOL

Holdings:
${portfolio.holdings
  .sort((a, b) => b.valueUsd - a.valueUsd)
  .slice(0, 15)
  .map(
    (h) =>
      `- ${h.symbol}: ${h.balance.toLocaleString()} ($${h.valueUsd.toFixed(2)}, ${h.percentOfPortfolio.toFixed(1)}%)`
  )
  .join('\n')}
`
      : '';

    const { object } = await generateObject({
      model,
      schema: WalletAnalysisSchema,
      prompt: `You are an elite Solana analyst and crypto advisor. Analyze this wallet's transactions and portfolio to provide actionable intelligence.

## TRANSACTION DATA (${transactions.length} recent transactions)
${JSON.stringify(txSummary, null, 2)}
${portfolioSummary}

## YOUR ANALYSIS MISSION

### 1. TRADING PATTERN ANALYSIS
Identify from transactions:
- Trading style (day trader, swing, holder, degen, DCA)
- Platform preferences (Jupiter, Raydium, Pump.fun, Tensor, etc.)
- Risk behavior (conservative, moderate, aggressive, yolo)
- Timing patterns and frequency

### 2. PORTFOLIO HEALTH CHECK
Evaluate their current holdings:
- Diversification (are they too concentrated in one asset?)
- Balance between SOL, stables, and altcoins
- Any dead/dust positions dragging them down
- Missing key categories (DeFi, memes, infrastructure, etc.)

### 3. GROWTH STRATEGY
Based on their style and holdings, recommend:
- Should they accumulate more, rebalance, take profits, or explore new sectors?
- Specific actions to improve their portfolio
- What they're doing well vs. what needs work

### 4. MARKET OPPORTUNITIES
Suggest opportunities matching their risk profile. Consider current Solana narratives:
- **AI**: AI agent tokens, GPU networks, AI infrastructure
- **DeFi**: Lending, perpetuals, liquid staking, yield farming
- **Memecoins**: Community-driven tokens (if they're a degen)
- **Infrastructure**: Oracles, bridges, dev tools
- **Gaming/NFTs**: If they show interest
- **RWA**: Real world assets coming on-chain

Be specific - name actual categories or types of projects, not vague suggestions.

### 5. WARNINGS
Flag any red flags:
- Overconcentration in single assets
- Low SOL reserves (can't pay for gas)
- Potential scam tokens in portfolio
- Poor timing patterns
- Missing obvious opportunities given their style

## OUTPUT RULES
- Be direct and specific, not generic
- Reference their actual holdings and transactions
- Give advice they can act on TODAY
- Match your tone to their style (degen gets degen advice)
- Each point should be 1-2 sentences max
- The summary should capture their situation and #1 priority`,
    });

    return {
      success: true,
      data: object,
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
    };
  }
}

/**
 * Generate a quick insight about a single transaction
 */
export async function getTransactionInsight(
  transaction: ParsedTransaction
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const model = getModel();

    const { text } = await generateText({
      model,
      prompt: `You are a witty Solana blockchain analyst. Give a single clever observation (max 15 words) about this transaction:

Type: ${transaction.type}
Source: ${transaction.source}
Description: ${transaction.description}
SOL moved: ${transaction.nativeTransfers.reduce((a, t) => a + t.amount, 0) / 1e9}
Tokens: ${transaction.tokenTransfers.length}

Be funny but insightful. No hashtags.`,
    });

    return {
      success: true,
      data: text.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Insight generation failed',
    };
  }
}

/**
 * Stream an analysis for real-time display
 */
export async function streamTransactionAnalysis(transactions: ParsedTransaction[]) {
  const model = getModel();

  const txSummary = transactions.slice(0, 10).map((tx) => ({
    type: tx.type,
    source: tx.source,
    description: tx.description,
    timestamp: new Date(tx.timestamp * 1000).toISOString(),
  }));

  const result = streamText({
    model,
    prompt: `You are a witty Solana blockchain analyst narrating a user's on-chain journey. Based on these recent transactions, tell their story in 2-3 entertaining sentences:

${JSON.stringify(txSummary, null, 2)}

Be conversational, use crypto slang, and make it engaging. Start directly with the analysis.`,
  });

  return result;
}

/**
 * Analyze portfolio composition and provide recommendations
 */
export async function analyzePortfolio(
  holdings: Array<{ symbol: string; balance: number; valueUsd: number }>
): Promise<{
  success: boolean;
  data?: { summary: string; risk: string; suggestions: string[] };
  error?: string;
}> {
  try {
    const model = getModel();

    const { object } = await generateObject({
      model,
      schema: z.object({
        summary: z.string().describe('A witty 1-2 sentence portfolio summary'),
        risk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'DEGEN']).describe('Risk level assessment'),
        suggestions: z.array(z.string()).max(3).describe('Brief actionable suggestions'),
      }),
      prompt: `Analyze this Solana portfolio and provide insights:

Holdings:
${holdings.map((h) => `- ${h.symbol}: ${h.balance.toLocaleString()} ($${h.valueUsd.toFixed(2)})`).join('\n')}

Be witty but helpful. Consider diversification, risk, and current market conditions.`,
    });

    return {
      success: true,
      data: object,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Portfolio analysis failed',
    };
  }
}

/**
 * Generate a name/label suggestion for a wallet based on its activity
 */
export async function suggestWalletLabel(
  transactions: ParsedTransaction[]
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const model = getModel();

    const types = [...new Set(transactions.map((t) => t.type))];
    const sources = [...new Set(transactions.map((t) => t.source).filter((s) => s !== 'UNKNOWN'))];

    const { text } = await generateText({
      model,
      prompt: `Based on this wallet's activity, suggest a short creative nickname (2-3 words max):

Transaction types: ${types.join(', ')}
Platforms used: ${sources.join(', ') || 'Various'}
Transaction count: ${transactions.length}

Examples: "Jupiter Junkie", "NFT Degen", "DeFi Whale", "Quiet Holder"
Just return the nickname, nothing else.`,
    });

    return {
      success: true,
      data: text.trim().replace(/"/g, ''),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Label suggestion failed',
    };
  }
}
