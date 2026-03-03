import type { AssetType } from './market';
import type { SignalType } from './signals';

export type TransactionType = 'buy' | 'sell';

export interface Holding {
  id: string;
  userId: string;
  symbol: string;
  assetType: AssetType;
  quantity: number;
  avgBuyPrice: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields (not stored in DB)
  currentPrice?: number;
  currentValue?: number;
  totalGainLoss?: number;
  totalGainLossPercent?: number;
  dayChangePercent?: number;
  signal?: SignalType;
}

export interface Transaction {
  id: string;
  holdingId: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fee: number;
  executedAt: Date;
  createdAt: Date;
  // Computed
  totalCost?: number; // quantity * price + fee
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: Holding[];
  allocation: AllocationItem[];
}

export interface AllocationItem {
  symbol: string;
  assetType: AssetType;
  value: number;
  percentage: number;
  color: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  assetType: AssetType;
  addedAt: Date;
  // Computed
  currentPrice?: number;
  priceChange24h?: number;
  signal?: SignalType;
}

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  assetType: AssetType;
  condition: 'above' | 'below';
  targetPrice: number;
  isActive: boolean;
  triggeredAt?: Date;
  createdAt: Date;
}
