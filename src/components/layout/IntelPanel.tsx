'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHoveredTransaction, useSelectedTransaction, useWalletStore } from '@/store/wallet';
import { useTransactionInsight, useAnalyzeTransactionsMutation } from '@/hooks/useAnalysis';
import { useTimelineTransactions } from '@/hooks/useTimeline';
import { useClusterAssets } from '@/hooks/useAssets';
import {
  truncateAddress,
  formatDateTime,
  formatSol,
  lamportsToSol,
  getTransactionTypeInfo,
  getSourceInfo,
  getSolanaExplorerUrl,
  copyToClipboard,
} from '@/lib/utils';
import type { ParsedTransaction } from '@/types';
import type { TransactionAnalysis } from '@/app/actions/analyze';

export function IntelPanel() {
  const hoveredTransaction = useHoveredTransaction();
  const selectedTransaction = useSelectedTransaction();
  const { setSelectedTransaction } = useWalletStore();
  const { transactions } = useTimelineTransactions();
  const { data: assets } = useClusterAssets();
  const [showAnalysis, setShowAnalysis] = useState(false);

  const transaction = selectedTransaction || hoveredTransaction;

  // Prepare portfolio data for AI analysis
  const portfolioData = useMemo(() => {
    if (!assets) return undefined;

    const solBalance = assets.nativeBalance.lamports / 1e9;
    const solValueUsd = assets.nativeBalance.total_price || 0;

    // Build holdings list from tokens
    const holdings = assets.tokens
      .filter((t) => t.token_info?.price_info?.total_price && t.token_info.price_info.total_price > 0.01)
      .map((t) => {
        const balance = (t.token_info?.balance || 0) / Math.pow(10, t.token_info?.decimals || 0);
        const valueUsd = t.token_info?.price_info?.total_price || 0;
        return {
          symbol: t.content?.metadata?.symbol || 'UNKNOWN',
          name: t.content?.metadata?.name,
          balance,
          valueUsd,
          percentOfPortfolio: 0, // Will calculate after
        };
      });

    // Calculate total and percentages
    const totalTokenValue = holdings.reduce((acc, h) => acc + h.valueUsd, 0);
    const totalValueUsd = solValueUsd + totalTokenValue;

    // Add SOL as a holding
    const allHoldings = [
      {
        symbol: 'SOL',
        name: 'Solana',
        balance: solBalance,
        valueUsd: solValueUsd,
        percentOfPortfolio: totalValueUsd > 0 ? (solValueUsd / totalValueUsd) * 100 : 0,
      },
      ...holdings.map((h) => ({
        ...h,
        percentOfPortfolio: totalValueUsd > 0 ? (h.valueUsd / totalValueUsd) * 100 : 0,
      })),
    ];

    return {
      holdings: allHoldings,
      totalValueUsd,
      solBalance,
    };
  }, [assets]);

  return (
    <motion.aside
      className="w-[320px] h-screen overflow-y-auto relative"
      style={{
        background: 'linear-gradient(180deg, rgba(10, 20, 35, 0.95) 0%, rgba(5, 10, 18, 0.98) 100%)',
        borderLeft: '1px solid rgba(0, 240, 255, 0.1)',
      }}
    >
      {/* Edge glow */}
      <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-[#00f0ff]/30 via-transparent to-[#00f0ff]/10" />

      {/* Header */}
      <div className="p-4 border-b border-[#00f0ff]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[9px] font-mono text-[#506070] tracking-widest">
              INTEL.MODULE
            </div>
          </div>
          {selectedTransaction && (
            <button
              onClick={() => setSelectedTransaction(null)}
              className="text-[10px] font-mono text-[#506070] hover:text-[#00f0ff] transition-colors tracking-wider"
            >
              [ CLEAR ]
            </button>
          )}
        </div>

        {/* Tabs */}
        {transactions.length > 0 && (
          <div className="mt-3 flex gap-2">
            <TabButton
              active={!showAnalysis}
              onClick={() => setShowAnalysis(false)}
              label="DETAILS"
            />
            <TabButton
              active={showAnalysis}
              onClick={() => setShowAnalysis(true)}
              label="AI.SCAN"
            />
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showAnalysis ? (
          <AIAnalysisView
            key="analysis"
            transactions={transactions.slice(0, 20)}
            portfolio={portfolioData}
          />
        ) : transaction ? (
          <TransactionDetail key={transaction.signature} transaction={transaction} />
        ) : (
          <EmptyState key="empty" />
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 px-3 text-[10px] font-mono tracking-wider rounded transition-all relative"
      style={{
        background: active ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
        color: active ? '#00f0ff' : '#506070',
        border: active ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid transparent',
      }}
    >
      {active && (
        <>
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00f0ff]/50" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00f0ff]/50" />
        </>
      )}
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-8 text-center"
    >
      <div className="text-2xl mb-4 opacity-30">◉</div>
      <p className="text-xs font-mono text-[#506070] tracking-wider">
        SELECT.TARGET.FOR.ANALYSIS
      </p>
    </motion.div>
  );
}

interface PortfolioForAnalysis {
  holdings: Array<{
    symbol: string;
    name?: string;
    balance: number;
    valueUsd: number;
    percentOfPortfolio: number;
  }>;
  totalValueUsd: number;
  solBalance: number;
}

function AIAnalysisView({
  transactions,
  portfolio,
}: {
  transactions: ParsedTransaction[];
  portfolio?: PortfolioForAnalysis;
}) {
  const mutation = useAnalyzeTransactionsMutation();
  const [analysis, setAnalysis] = useState<TransactionAnalysis | null>(null);

  const handleAnalyze = async () => {
    try {
      const result = await mutation.mutateAsync({ transactions, portfolio });
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-4"
    >
      {!analysis && !mutation.isPending && (
        <HoloCard>
          <div className="text-center py-4">
            <div className="text-2xl mb-3 opacity-40">◈</div>
            <div className="text-[10px] font-mono text-[#506070] tracking-wider mb-2">
              ANALYZE WALLET
            </div>
            <div className="text-[9px] font-mono text-[#405060] mb-4">
              {transactions.length} TXs{portfolio ? ` · $${portfolio.totalValueUsd.toFixed(0)} Portfolio` : ''}
            </div>
            <button
              onClick={handleAnalyze}
              disabled={transactions.length === 0}
              className="px-4 py-2 rounded text-[10px] font-mono tracking-wider transition-all disabled:opacity-50"
              style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                color: '#00f0ff',
              }}
            >
              [ INITIATE.SCAN ]
            </button>
          </div>
        </HoloCard>
      )}

      {mutation.isPending && (
        <div className="py-8 flex flex-col items-center">
          {/* Pulsing Orb */}
          <div className="relative w-24 h-24 mb-6">
            {/* Outer ring pulses */}
            <motion.div
              className="absolute inset-0 rounded-full border border-[#00f0ff]/30"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border border-[#9945ff]/30"
              animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border border-[#00f0ff]/20"
              animate={{ scale: [1, 2.2, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeOut', delay: 1 }}
            />

            {/* Middle rotating ring */}
            <motion.div
              className="absolute inset-2 rounded-full"
              style={{
                border: '2px dashed rgba(0, 240, 255, 0.3)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />

            {/* Inner glow orb */}
            <motion.div
              className="absolute inset-4 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(0, 240, 255, 0.4) 0%, rgba(153, 69, 255, 0.2) 50%, transparent 70%)',
                boxShadow: '0 0 30px rgba(0, 240, 255, 0.5), inset 0 0 20px rgba(0, 240, 255, 0.3)',
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Core */}
            <motion.div
              className="absolute inset-8 rounded-full bg-[#00f0ff]"
              style={{
                boxShadow: '0 0 20px #00f0ff, 0 0 40px rgba(0, 240, 255, 0.5)',
              }}
              animate={{
                opacity: [0.6, 1, 0.6],
                boxShadow: [
                  '0 0 20px #00f0ff, 0 0 40px rgba(0, 240, 255, 0.5)',
                  '0 0 30px #00f0ff, 0 0 60px rgba(0, 240, 255, 0.7)',
                  '0 0 20px #00f0ff, 0 0 40px rgba(0, 240, 255, 0.5)',
                ],
              }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* Status text */}
          <motion.div
            className="text-[10px] font-mono text-[#00f0ff] tracking-widest"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            ANALYZING.PATTERNS
          </motion.div>
          <div className="text-[9px] font-mono text-[#506070] mt-2 tracking-wider">
            {mutation.variables?.transactions?.length || 0} TXs
            {mutation.variables?.portfolio ? ` · $${mutation.variables.portfolio.totalValueUsd.toFixed(0)}` : ''}
          </div>
        </div>
      )}

      {mutation.isError && (
        <HoloCard accent="#ff6080">
          <div className="text-center py-4">
            <div className="text-[10px] font-mono text-[#ff6080] tracking-wider mb-2">
              ERROR: {mutation.error?.message || 'SCAN.FAILED'}
            </div>
            <button
              onClick={handleAnalyze}
              className="text-[10px] font-mono text-[#506070] hover:text-[#00f0ff] transition-colors"
            >
              [ RETRY ]
            </button>
          </div>
        </HoloCard>
      )}

      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Summary */}
          <HoloCard>
            <p className="text-xs text-[#a0b0c0] leading-relaxed">{analysis.summary}</p>
          </HoloCard>

          {/* Portfolio Health */}
          {'portfolioAnalysis' in analysis && analysis.portfolioAnalysis && (
            <HoloCard accent={
              analysis.portfolioAnalysis.health === 'excellent' ? '#40ff90' :
              analysis.portfolioAnalysis.health === 'good' ? '#00f0ff' :
              analysis.portfolioAnalysis.health === 'fair' ? '#ff9040' : '#ff6080'
            }>
              <div className="text-[9px] font-mono text-[#506070] tracking-widest mb-2">
                PORTFOLIO.HEALTH
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono uppercase" style={{
                  color: analysis.portfolioAnalysis.health === 'excellent' ? '#40ff90' :
                         analysis.portfolioAnalysis.health === 'good' ? '#00f0ff' :
                         analysis.portfolioAnalysis.health === 'fair' ? '#ff9040' : '#ff6080'
                }}>
                  {analysis.portfolioAnalysis.health}
                </span>
                <span className="text-[9px] text-[#506070]">·</span>
                <span className="text-[10px] text-[#8090a0]">
                  {analysis.portfolioAnalysis.concentration.replace(/_/g, ' ')}
                </span>
              </div>
              {analysis.portfolioAnalysis.issues.length > 0 && (
                <ul className="space-y-1">
                  {analysis.portfolioAnalysis.issues.map((issue, i) => (
                    <li key={i} className="text-[10px] text-[#8090a0] flex items-start gap-1">
                      <span className="text-[#ff9040]">!</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              )}
            </HoloCard>
          )}

          {/* Trading Insights */}
          {'tradingInsights' in analysis && analysis.tradingInsights?.length > 0 && (
            <HoloCard>
              <div className="text-[9px] font-mono text-[#506070] tracking-widest mb-2">
                TRADING.PATTERNS
              </div>
              <ul className="space-y-2">
                {analysis.tradingInsights.map((insight, i) => (
                  <li key={i} className="text-[10px] text-[#8090a0] flex items-start gap-2">
                    <span className="text-[#00f0ff]">›</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </HoloCard>
          )}

          {/* Growth Strategy */}
          {'growthStrategy' in analysis && analysis.growthStrategy && (
            <HoloCard accent="#9945ff">
              <div className="text-[9px] font-mono text-[#506070] tracking-widest mb-2">
                GROWTH.STRATEGY
              </div>
              <div className="text-[10px] font-mono text-[#9945ff] uppercase mb-2">
                {analysis.growthStrategy.approach.replace(/_/g, ' ')}
              </div>
              <ul className="space-y-2">
                {analysis.growthStrategy.actions.map((action, i) => (
                  <li key={i} className="text-[10px] text-[#8090a0] flex items-start gap-2">
                    <span className="text-[#9945ff]">→</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </HoloCard>
          )}

          {/* Opportunities */}
          {'opportunities' in analysis && analysis.opportunities?.length > 0 && (
            <HoloCard accent="#40ff90">
              <div className="text-[9px] font-mono text-[#506070] tracking-widest mb-2">
                OPPORTUNITIES
              </div>
              <ul className="space-y-2">
                {analysis.opportunities.map((opp, i) => (
                  <li key={i} className="text-[10px] text-[#8090a0]">
                    <span className="text-[8px] font-mono text-[#40ff90] uppercase bg-[#40ff90]/10 px-1.5 py-0.5 rounded mr-2">
                      {opp.category}
                    </span>
                    <span>{opp.suggestion}</span>
                  </li>
                ))}
              </ul>
            </HoloCard>
          )}

          {/* Warnings */}
          {'warnings' in analysis && analysis.warnings?.length > 0 && (
            <HoloCard accent="#ff6080">
              <div className="text-[9px] font-mono text-[#506070] tracking-widest mb-2">
                WARNINGS
              </div>
              <ul className="space-y-2">
                {analysis.warnings.map((warning, i) => (
                  <li key={i} className="text-[10px] text-[#ff6080] flex items-start gap-2">
                    <span>⚠</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </HoloCard>
          )}

          <button
            onClick={handleAnalyze}
            className="w-full py-2 text-[10px] font-mono text-[#506070] hover:text-[#00f0ff] transition-colors tracking-wider"
          >
            [ RE-SCAN ]
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

function HoloCard({ children, accent = '#00f0ff' }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="p-4 rounded relative"
      style={{
        background: `linear-gradient(135deg, ${accent}05, transparent)`,
        border: `1px solid ${accent}15`,
      }}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: `${accent}30` }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: `${accent}30` }} />
      {children}
    </div>
  );
}

function DataField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="p-3 rounded relative"
      style={{
        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.02), transparent)',
        border: '1px solid rgba(0, 240, 255, 0.08)',
      }}
    >
      <div className="text-[9px] font-mono text-[#506070] tracking-widest mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function TransactionDetail({ transaction }: { transaction: ParsedTransaction }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { data: aiInsight, isLoading: insightLoading } = useTransactionInsight(transaction);
  const typeInfo = getTransactionTypeInfo(transaction.type);
  const sourceInfo = getSourceInfo(transaction.source);

  const handleCopy = async (text: string, field: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const totalSolMoved = transaction.nativeTransfers.reduce((acc, t) => acc + t.amount, 0);
  const feeInSol = lamportsToSol(transaction.fee);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="p-4 space-y-3"
    >
      {/* Type Header */}
      <HoloCard accent={typeInfo.color}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded flex items-center justify-center text-xl relative"
            style={{
              background: `${typeInfo.color}15`,
              border: `1px solid ${typeInfo.color}30`,
            }}
          >
            {typeInfo.icon}
          </div>
          <div>
            <div className="text-sm font-mono" style={{ color: typeInfo.color }}>
              {typeInfo.label}
            </div>
            {transaction.source !== 'UNKNOWN' && (
              <div className="text-[10px] font-mono text-[#506070]">
                via {sourceInfo.label}
              </div>
            )}
          </div>
        </div>
      </HoloCard>

      {/* AI Insight */}
      {(aiInsight || insightLoading) && (
        <DataField label="AI.INSIGHT">
          {insightLoading ? (
            <div className="h-3 w-3/4 rounded bg-[#00f0ff]/10 animate-pulse" />
          ) : (
            <p className="text-xs italic text-[#8090a0]">{aiInsight}</p>
          )}
        </DataField>
      )}

      {/* Description */}
      <DataField label="DESCRIPTION">
        <p className="text-xs text-[#8090a0]">
          {transaction.description || 'No description available'}
        </p>
      </DataField>

      {/* Signature */}
      <DataField label="SIGNATURE">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(transaction.signature, 'signature')}
            className="text-xs font-mono text-[#8090a0] hover:text-[#00f0ff] transition-colors truncate flex-1 text-left"
          >
            {copiedField === 'signature' ? '✓ COPIED' : truncateAddress(transaction.signature, 8)}
          </button>
          <a
            href={getSolanaExplorerUrl(transaction.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#506070] hover:text-[#00f0ff] transition-colors"
          >
            ↗
          </a>
        </div>
      </DataField>

      {/* Timestamp */}
      <DataField label="TIMESTAMP">
        <div className="text-xs font-mono text-[#8090a0]">
          {formatDateTime(transaction.timestamp)}
        </div>
      </DataField>

      {/* Fee */}
      <DataField label="FEE">
        <div className="text-xs font-mono text-[#00f0ff]">
          {formatSol(feeInSol, 6)} SOL
        </div>
      </DataField>

      {/* Native Transfers */}
      {transaction.nativeTransfers.length > 0 && (
        <DataField label={`SOL.TRANSFERS [${transaction.nativeTransfers.length}]`}>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {transaction.nativeTransfers.map((transfer, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 min-w-0 font-mono text-[#506070]">
                  <span className="truncate">{truncateAddress(transfer.fromUserAccount, 4)}</span>
                  <span className="text-[#00f0ff]">→</span>
                  <span className="truncate">{truncateAddress(transfer.toUserAccount, 4)}</span>
                </div>
                <span className="text-[#00f0ff] ml-2 flex-shrink-0 font-mono">
                  {formatSol(lamportsToSol(transfer.amount))}
                </span>
              </div>
            ))}
          </div>
          {totalSolMoved > 0 && (
            <div className="mt-2 pt-2 border-t border-[#00f0ff]/10 flex justify-between text-xs">
              <span className="text-[#506070] font-mono">TOTAL</span>
              <span className="font-mono text-[#00f0ff]">
                {formatSol(lamportsToSol(totalSolMoved))} SOL
              </span>
            </div>
          )}
        </DataField>
      )}

      {/* Token Transfers */}
      {transaction.tokenTransfers.length > 0 && (
        <DataField label={`TOKEN.TRANSFERS [${transaction.tokenTransfers.length}]`}>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {transaction.tokenTransfers.map((transfer, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#506070] truncate">
                  {truncateAddress(transfer.mint, 4)}
                </span>
                <span className="text-[#5090c0] ml-2 flex-shrink-0 font-mono">
                  {transfer.tokenAmount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </DataField>
      )}

      {/* Slot */}
      <DataField label="BLOCK.SLOT">
        <div className="text-xs font-mono text-[#8090a0]">
          {transaction.slot.toLocaleString()}
        </div>
      </DataField>
    </motion.div>
  );
}
