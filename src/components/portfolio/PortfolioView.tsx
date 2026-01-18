'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClusterAssets, usePortfolioValue, useFrozenMints } from '@/hooks/useAssets';
import { useCloseAccounts } from '@/hooks/useCloseAccounts';
import { formatSol, formatUsd, formatCompact, cn } from '@/lib/utils';
import type { DASAsset } from '@/types';

// Minimum rent-exempt balance for token accounts (in lamports)
const TOKEN_ACCOUNT_RENT = 0.00203928 * 1e9; // ~0.002 SOL

interface TokenRowProps {
  token: DASAsset;
  allocation: number;
  rank: number;
}

function TokenRow({ token, allocation, rank }: TokenRowProps) {
  const [expanded, setExpanded] = useState(false);
  const info = token.token_info;
  const metadata = token.content?.metadata;

  const balance = info?.balance || 0;
  const decimals = info?.decimals || 0;
  const displayBalance = balance / Math.pow(10, decimals);
  const price = info?.price_info?.price_per_token || 0;
  const totalValue = info?.price_info?.total_price || 0;

  const symbol = metadata?.symbol || 'UNKNOWN';
  const name = metadata?.name || symbol;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
      className="group relative"
    >
      <div
        className={cn(
          'p-3 rounded cursor-pointer transition-all duration-200',
          'hover:bg-[#00f0ff]/5'
        )}
        style={{
          background: 'rgba(10, 20, 35, 0.4)',
          border: '1px solid rgba(0, 240, 255, 0.06)',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Hover glow */}
        <div
          className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.05), transparent)',
            borderLeft: '2px solid rgba(0, 240, 255, 0.2)',
          }}
        />

        <div className="relative flex items-center gap-3">
          {/* Rank */}
          <div className="w-6 text-center">
            <span className="text-[10px] font-mono text-[#3a4a5a]">
              {rank <= 3 ? ['I', 'II', 'III'][rank - 1] : rank}
            </span>
          </div>

          {/* Token Icon */}
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${getTokenColor(symbol)}20, transparent)`,
              border: `1px solid ${getTokenColor(symbol)}40`,
              color: getTokenColor(symbol),
            }}
          >
            {symbol.slice(0, 2)}
          </div>

          {/* Name & Symbol */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-[#d0d8e0] truncate">{symbol}</span>
              <span className="text-[10px] text-[#506070] truncate hidden sm:inline">
                {name !== symbol && name}
              </span>
            </div>
            <div className="text-[10px] text-[#3a4a5a] font-mono">
              {formatCompact(displayBalance)} tokens
            </div>
          </div>

          {/* Allocation Bar */}
          <div className="w-20 hidden md:block">
            <div className="h-1 rounded-full bg-[#0a1520] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: getTokenColor(symbol) }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(allocation, 100)}%` }}
                transition={{ duration: 0.8, delay: rank * 0.05 }}
              />
            </div>
            <div className="text-[9px] text-[#506070] text-right mt-0.5 font-mono">
              {allocation.toFixed(1)}%
            </div>
          </div>

          {/* Value */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-mono text-[#00f0ff]">{formatUsd(totalValue)}</div>
            {price > 0 && (
              <div className="text-[10px] text-[#506070] font-mono">
                @{price < 0.01 ? price.toExponential(2) : formatUsd(price)}
              </div>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-[#00f0ff]/10 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[9px] text-[#506070] font-mono">MINT</div>
                  <div className="text-[10px] text-[#8090a0] font-mono truncate">
                    {token.id.slice(0, 8)}...{token.id.slice(-6)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-[#506070] font-mono">DECIMALS</div>
                  <div className="text-[10px] text-[#8090a0] font-mono">{decimals}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#506070] font-mono">RAW.BALANCE</div>
                  <div className="text-[10px] text-[#8090a0] font-mono">
                    {formatCompact(balance)}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface DustAccountProps {
  token: DASAsset;
  onSelect: (token: DASAsset) => void;
  selected: boolean;
}

function DustAccount({ token, onSelect, selected }: DustAccountProps) {
  const metadata = token.content?.metadata;
  const symbol = metadata?.symbol || 'UNKNOWN';
  const value = token.token_info?.price_info?.total_price || 0;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(token)}
      className={cn(
        'p-2 rounded text-left transition-all relative',
        selected ? 'ring-1 ring-[#00f0ff]' : ''
      )}
      style={{
        background: selected ? 'rgba(0, 240, 255, 0.1)' : 'rgba(10, 20, 35, 0.4)',
        border: '1px solid rgba(0, 240, 255, 0.1)',
      }}
    >
      {selected && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#00f0ff]" />}
      <div className="text-xs font-medium text-[#d0d8e0] truncate">{symbol}</div>
      <div className="text-[10px] text-[#506070] font-mono">
        {value > 0 ? formatUsd(value) : 'No value'}
      </div>
    </motion.button>
  );
}

function AllocationChart({ tokens, totalValue }: { tokens: DASAsset[]; totalValue: number }) {
  const chartData = useMemo(() => {
    const data: { symbol: string; value: number; percent: number; color: string }[] = [];
    let accumulated = 0;

    // Top tokens for the chart
    const topTokens = tokens.slice(0, 8);

    for (const token of topTokens) {
      const value = token.token_info?.price_info?.total_price || 0;
      const percent = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const symbol = token.content?.metadata?.symbol || 'UNKNOWN';

      data.push({
        symbol,
        value,
        percent,
        color: getTokenColor(symbol),
      });
      accumulated += percent;
    }

    // Add "Other" if there are more tokens
    if (tokens.length > 8 && accumulated < 100) {
      data.push({
        symbol: 'Other',
        value: totalValue * ((100 - accumulated) / 100),
        percent: 100 - accumulated,
        color: '#3a4a5a',
      });
    }

    return data;
  }, [tokens, totalValue]);

  // Calculate arc positions for donut chart
  const arcs = useMemo(() => {
    const result: { startAngle: number; endAngle: number; color: string; symbol: string }[] = [];
    let currentAngle = -90; // Start from top

    for (const item of chartData) {
      const angle = (item.percent / 100) * 360;
      result.push({
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: item.color,
        symbol: item.symbol,
      });
      currentAngle += angle;
    }

    return result;
  }, [chartData]);

  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center">
      {/* Donut Chart */}
      <div className="relative mb-4">
        <svg width={size} height={size} className="transform -rotate-90">
          {arcs.map((arc, i) => {
            const startAngle = (arc.startAngle * Math.PI) / 180;
            const endAngle = (arc.endAngle * Math.PI) / 180;

            const x1 = center + radius * Math.cos(startAngle);
            const y1 = center + radius * Math.sin(startAngle);
            const x2 = center + radius * Math.cos(endAngle);
            const y2 = center + radius * Math.sin(endAngle);

            const largeArc = arc.endAngle - arc.startAngle > 180 ? 1 : 0;

            const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

            return (
              <motion.path
                key={arc.symbol}
                d={d}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: i * 0.1 }}
              />
            );
          })}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[10px] text-[#506070] font-mono">TOTAL</div>
            <div className="text-sm text-[#00f0ff] font-mono font-medium">
              {formatUsd(totalValue)}
            </div>
          </div>
        </div>
      </div>

      {/* Legend - stacked below chart */}
      <div className="w-full space-y-1">
        {chartData.slice(0, 5).map((item) => (
          <div key={item.symbol} className="flex items-center gap-2 px-1">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: item.color }}
            />
            <span className="text-[10px] text-[#8090a0] font-mono flex-1 truncate">
              {item.symbol}
            </span>
            <span className="text-[10px] text-[#506070] font-mono">{item.percent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIRecommendations({
  tokens,
  dustCount,
  totalValue,
}: {
  tokens: DASAsset[];
  dustCount: number;
  totalValue: number;
}) {
  const recommendations = useMemo(() => {
    const recs: { type: 'warning' | 'info' | 'success'; title: string; message: string }[] = [];

    // Dust account recommendation
    if (dustCount > 0) {
      const reclaimable = dustCount * 0.002;
      recs.push({
        type: 'info',
        title: 'Reclaim Rent',
        message: `You have ${dustCount} dust accounts. Close them to reclaim ~${formatSol(reclaimable)} SOL.`,
      });
    }

    // Concentration warning
    if (tokens.length > 0) {
      const topToken = tokens[0];
      const topValue = topToken.token_info?.price_info?.total_price || 0;
      const topPercent = totalValue > 0 ? (topValue / totalValue) * 100 : 0;

      if (topPercent > 50) {
        const symbol = topToken.content?.metadata?.symbol || 'token';
        recs.push({
          type: 'warning',
          title: 'High Concentration',
          message: `${symbol} represents ${topPercent.toFixed(0)}% of your portfolio. Consider diversifying.`,
        });
      }
    }

    // Low diversity
    if (tokens.length < 3 && tokens.length > 0) {
      recs.push({
        type: 'info',
        title: 'Low Diversity',
        message: 'Your portfolio has few tokens. Diversification can reduce risk.',
      });
    }

    // Healthy portfolio
    if (recs.length === 0) {
      recs.push({
        type: 'success',
        title: 'Portfolio Health',
        message: 'Your portfolio looks well-balanced. No immediate actions recommended.',
      });
    }

    return recs;
  }, [tokens, dustCount, totalValue]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return '!';
      case 'success':
        return '+';
      default:
        return 'i';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'warning':
        return '#ff9040';
      case 'success':
        return '#40ff90';
      default:
        return '#00f0ff';
    }
  };

  return (
    <div className="space-y-2">
      {recommendations.map((rec, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-3 rounded relative"
          style={{
            background: `linear-gradient(135deg, ${getColor(rec.type)}08, transparent)`,
            border: `1px solid ${getColor(rec.type)}20`,
          }}
        >
          <div className="flex gap-3">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
              style={{
                background: `${getColor(rec.type)}20`,
                color: getColor(rec.type),
              }}
            >
              {getIcon(rec.type)}
            </div>
            <div>
              <div className="text-xs font-medium text-[#d0d8e0]">{rec.title}</div>
              <div className="text-[10px] text-[#506070] mt-0.5">{rec.message}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Token color generator based on symbol
function getTokenColor(symbol: string): string {
  const colors: Record<string, string> = {
    SOL: '#14f195',
    USDC: '#2775ca',
    USDT: '#26a17b',
    BONK: '#f7931a',
    JUP: '#00d395',
    RAY: '#5ac4be',
    ORCA: '#ffb347',
    MSOL: '#9945ff',
    JITOSOL: '#00f0ff',
  };

  if (colors[symbol]) return colors[symbol];

  // Generate consistent color from symbol
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 55%)`;
}

export function PortfolioView() {
  const { data: assets, isLoading, error, refetch } = useClusterAssets();
  const { data: portfolioValue } = usePortfolioValue();
  const { data: frozenMints } = useFrozenMints();
  const [selectedDust, setSelectedDust] = useState<Set<string>>(new Set());
  const { closeAccounts, isClosing, statusMessage, closedMints, reclaimedSOL, clearClosedMints } =
    useCloseAccounts();
  const [closeResult, setCloseResult] = useState<{ success: boolean; message: string } | null>(
    null
  );

  const { tokens, dustAccounts, totalTokenValue, solValue } = useMemo(() => {
    if (!assets) {
      return { tokens: [], dustAccounts: [], totalTokenValue: 0, solValue: 0 };
    }

    const solVal = assets.nativeBalance.total_price || 0;

    // Separate valuable tokens from dust
    const valuable: DASAsset[] = [];
    const dust: DASAsset[] = [];
    let tokenVal = 0;

    for (const token of assets.tokens) {
      const value = token.token_info?.price_info?.total_price || 0;
      tokenVal += value;

      // Consider "dust" as tokens worth less than $1
      // Exclude frozen accounts (from RPC check) - they can't be closed
      // Also exclude already-closed mints (real-time update)
      const isFrozen = frozenMints?.has(token.id) || token.ownership?.frozen;
      if (value < 1) {
        if (!isFrozen && !closedMints.has(token.id)) {
          dust.push(token);
        }
      } else {
        valuable.push(token);
      }
    }

    return {
      tokens: valuable,
      dustAccounts: dust,
      totalTokenValue: tokenVal,
      solValue: solVal,
    };
  }, [assets, closedMints, frozenMints]);

  // portfolioValue.totalUsd already includes SOL + tokens
  // Only use solValue as fallback if portfolioValue not available
  const totalValue = portfolioValue?.totalUsd || totalTokenValue + solValue;

  const handleSelectDust = (token: DASAsset) => {
    setSelectedDust((prev) => {
      const next = new Set(prev);
      if (next.has(token.id)) {
        next.delete(token.id);
      } else {
        next.add(token.id);
      }
      return next;
    });
  };

  const handleSelectAllDust = () => {
    if (activeSelectedDust.size === dustAccounts.length && dustAccounts.length > 0) {
      setSelectedDust(new Set());
    } else {
      setSelectedDust(new Set(dustAccounts.map((t) => t.id)));
    }
  };

  const handleCloseDust = async () => {
    if (selectedDust.size === 0) return;

    setCloseResult(null);

    // Map selected IDs to token info with mint, program, and balance
    const tokensToClose = dustAccounts
      .filter((token) => selectedDust.has(token.id))
      .map((token) => ({
        mint: token.id,
        tokenProgram: token.token_info?.token_program,
        balance: token.token_info?.balance, // Raw balance for burn instruction
      }));

    const result = await closeAccounts(tokensToClose);

    if (result.success) {
      const skippedMsg = result.skippedCount ? ` (${result.skippedCount} frozen/skipped)` : '';
      setCloseResult({
        success: true,
        message: `Closed ${result.closedCount} accounts! Reclaimed ~${formatSol(result.closedCount * 0.00203928)} SOL${skippedMsg}`,
      });
      setSelectedDust(new Set());
      // Refetch assets after closing, then clear closed mints tracking
      setTimeout(() => {
        refetch();
        clearClosedMints();
      }, 2000);
    } else {
      const skippedMsg = result.skippedCount ? ` (${result.skippedCount} frozen/skipped)` : '';
      setCloseResult({
        success: false,
        message: (result.error || 'Failed to close accounts') + skippedMsg,
      });
    }

    // Clear result after 5 seconds
    setTimeout(() => setCloseResult(null), 5000);
  };

  // Filter out closed mints from selection
  const activeSelectedDust = new Set(Array.from(selectedDust).filter((id) => !closedMints.has(id)));

  const reclaimableSOL = activeSelectedDust.size * 0.00203928;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-[#00f0ff]/20 border-t-[#00f0ff]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <div className="text-xs font-mono text-[#506070]">LOADING.PORTFOLIO</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="p-6 text-center max-w-md rounded relative"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 96, 128, 0.05), transparent)',
            border: '1px solid rgba(255, 96, 128, 0.2)',
          }}
        >
          <div className="text-[#ff6080] mb-2 text-sm font-mono">ERROR.LOADING.PORTFOLIO</div>
          <p className="text-xs text-[#506070] font-mono">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-4"
      >
        <div className="hud-corners relative px-4 py-2">
          <span className="text-[#00f0ff] text-xs font-mono tracking-widest">SYS.PORTFOLIO</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[#00f0ff]/30 via-[#00f0ff]/10 to-transparent" />
        <div className="text-right">
          <div className="text-[10px] font-mono text-[#506070]">NET.WORTH</div>
          <div className="text-lg font-mono text-[#00f0ff] font-medium">
            {formatUsd(totalValue)}
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Allocation & Stats */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Allocation Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded relative flex-shrink-0"
            style={{
              background: 'rgba(10, 20, 35, 0.6)',
              border: '1px solid rgba(0, 240, 255, 0.1)',
            }}
          >
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00f0ff]/30" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#00f0ff]/30" />

            <div className="text-[10px] font-mono text-[#506070] tracking-widest mb-3">
              ALLOCATION.CHART
            </div>

            <AllocationChart tokens={tokens} totalValue={totalTokenValue} />
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded relative flex-shrink-0"
            style={{
              background: 'rgba(10, 20, 35, 0.6)',
              border: '1px solid rgba(0, 240, 255, 0.1)',
            }}
          >
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00f0ff]/30" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#00f0ff]/30" />

            <div className="text-[10px] font-mono text-[#506070] tracking-widest mb-3">
              QUICK.STATS
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-[#0a1520]/50">
                <div className="text-[9px] font-mono text-[#506070]">SOL</div>
                <div className="text-sm font-mono text-[#14f195]">
                  {formatSol(
                    assets?.nativeBalance.lamports ? assets.nativeBalance.lamports / 1e9 : 0
                  )}
                </div>
              </div>
              <div className="p-2 rounded bg-[#0a1520]/50">
                <div className="text-[9px] font-mono text-[#506070]">TOKENS</div>
                <div className="text-sm font-mono text-[#00f0ff]">{tokens.length}</div>
              </div>
              <div className="p-2 rounded bg-[#0a1520]/50">
                <div className="text-[9px] font-mono text-[#506070]">NFTS</div>
                <div className="text-sm font-mono text-[#9945ff]">{assets?.nfts.length || 0}</div>
              </div>
              <div className="p-2 rounded bg-[#0a1520]/50">
                <div className="text-[9px] font-mono text-[#506070]">DUST</div>
                <div className="text-sm font-mono text-[#ff9040]">{dustAccounts.length}</div>
              </div>
            </div>
          </motion.div>

          {/* AI Recommendations */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded relative"
            style={{
              background: 'rgba(10, 20, 35, 0.6)',
              border: '1px solid rgba(0, 240, 255, 0.1)',
            }}
          >
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00f0ff]/30" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#00f0ff]/30" />

            <div className="text-[10px] font-mono text-[#506070] tracking-widest mb-4">
              AI.INSIGHTS
            </div>

            <AIRecommendations
              tokens={tokens}
              dustCount={dustAccounts.length}
              totalValue={totalValue}
            />
          </motion.div>
        </div>

        {/* Right Column - Token Holdings & Dust */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Token Holdings */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded relative"
            style={{
              background: 'rgba(10, 20, 35, 0.6)',
              border: '1px solid rgba(0, 240, 255, 0.1)',
            }}
          >
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00f0ff]/30" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#00f0ff]/30" />

            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-mono text-[#506070] tracking-widest">
                TOKEN.HOLDINGS
              </div>
              <div className="text-[10px] font-mono text-[#00f0ff]">{tokens.length} assets</div>
            </div>

            {tokens.length === 0 ? (
              <div className="py-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl opacity-30 mb-2">$</div>
                  <div className="text-xs text-[#506070] font-mono">NO.TOKENS.FOUND</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {tokens.map((token, i) => {
                  const value = token.token_info?.price_info?.total_price || 0;
                  const allocation = totalTokenValue > 0 ? (value / totalTokenValue) * 100 : 0;

                  return (
                    <TokenRow key={token.id} token={token} allocation={allocation} rank={i + 1} />
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Dust Accounts / Rent Reclaim - fixed height at bottom */}
          {dustAccounts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="p-4 rounded relative flex-shrink-0 flex flex-col"
              style={{
                background: 'rgba(10, 20, 35, 0.6)',
                border: '1px solid rgba(255, 144, 64, 0.15)',
                maxHeight: '220px',
              }}
            >
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#ff9040]/30" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#ff9040]/30" />

              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div>
                  <div className="text-[10px] font-mono text-[#ff9040] tracking-widest">
                    DUST.ACCOUNTS ({dustAccounts.length})
                  </div>
                  <div className="text-[9px] font-mono text-[#506070] mt-0.5">
                    Reclaim ~{formatSol(dustAccounts.length * 0.002)} SOL
                  </div>
                </div>
                <button
                  onClick={handleSelectAllDust}
                  className="text-[10px] font-mono text-[#ff9040] hover:text-[#ffb060] transition-colors px-2 py-1 rounded bg-[#ff9040]/10"
                >
                  {activeSelectedDust.size === dustAccounts.length && dustAccounts.length > 0
                    ? 'DESELECT'
                    : 'SELECT.ALL'}
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1 py-1">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {dustAccounts.map((token) => (
                    <DustAccount
                      key={token.id}
                      token={token}
                      onSelect={handleSelectDust}
                      selected={activeSelectedDust.has(token.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Close Result Message */}
              {closeResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-2 rounded text-[10px] font-mono text-center"
                  style={{
                    background: closeResult.success
                      ? 'rgba(64, 255, 144, 0.1)'
                      : 'rgba(255, 96, 128, 0.1)',
                    border: `1px solid ${closeResult.success ? 'rgba(64, 255, 144, 0.3)' : 'rgba(255, 96, 128, 0.3)'}`,
                    color: closeResult.success ? '#40ff90' : '#ff6080',
                  }}
                >
                  {closeResult.message}
                </motion.div>
              )}

              {(activeSelectedDust.size > 0 || isClosing) && !closeResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 pt-3 border-t border-[#ff9040]/20 flex flex-col gap-2 flex-shrink-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-[#d0d8e0] font-mono">
                      {isClosing && reclaimedSOL > 0 ? (
                        <span className="text-[#40ff90]">
                          Reclaimed: {formatSol(reclaimedSOL)} SOL ({closedMints.size} closed)
                        </span>
                      ) : (
                        <span>
                          {activeSelectedDust.size} selected = ~{formatSol(reclaimableSOL)} SOL
                        </span>
                      )}
                    </div>
                    <motion.button
                      onClick={handleCloseDust}
                      disabled={isClosing || activeSelectedDust.size === 0}
                      whileHover={{ scale: isClosing ? 1 : 1.02 }}
                      whileTap={{ scale: isClosing ? 1 : 0.98 }}
                      className="px-3 py-1.5 rounded text-[10px] font-mono font-medium disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #ff9040, #ff6020)',
                        color: '#000',
                      }}
                    >
                      {isClosing ? 'PROCESSING...' : 'CLOSE'}
                    </motion.button>
                  </div>
                  {isClosing && statusMessage && (
                    <div className="text-[10px] text-[#00f0ff] font-mono animate-pulse">
                      {statusMessage}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom spacer for scroll padding */}
      <div className="h-16 lg:h-8 flex-shrink-0" />
    </div>
  );
}
