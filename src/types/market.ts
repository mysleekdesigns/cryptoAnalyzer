// Asset types
export type AssetType = 'crypto' | 'stock';

// OHLCV (Open, High, Low, Close, Volume) data point
export interface OHLCVData {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Generic asset representation
export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  image?: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  marketCap?: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  rank?: number;
}

// Ticker for real-time price updates
export interface Ticker {
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
}

// Market data response
export interface MarketData {
  assets: Asset[];
  lastUpdated: number;
  isStale: boolean;
}

// CoinGecko specific response types
export interface CoinGeckoMarketResponse {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}

export interface CoinGeckoChartResponse {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

// Alpha Vantage types
export interface AlphaVantageTimeSeries {
  [date: string]: {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  };
}

export interface AlphaVantageOverview {
  Symbol: string;
  Name: string;
  Description: string;
  Exchange: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  PERatio: string;
  DividendYield: string;
  '52WeekHigh': string;
  '52WeekLow': string;
}

// Finnhub types
export interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High
  l: number; // Low
  o: number; // Open
  pc: number; // Previous close
  t: number; // Timestamp
}

export interface FinnhubCandle {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  s: string; // Status
  t: number[]; // Timestamps
  v: number[]; // Volumes
}

// Fear & Greed
export interface FearGreedData {
  value: number; // 0-100
  valueClassification: string; // "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"
  timestamp: number;
}

// Time range for charts
export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

// Cache wrapper
export interface CachedResponse<T> {
  data: T;
  cachedAt: number;
  isStale: boolean;
}
