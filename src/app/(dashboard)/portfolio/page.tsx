"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils/index";
import { formatCurrency, formatPercent } from "@/lib/utils/formatters";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { RecordTransactionDialog } from "@/components/portfolio/record-transaction-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const AllocationChart = dynamic(
  () => import("@/components/portfolio/allocation-chart").then((mod) => mod.AllocationChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[250px] w-full rounded-lg" />,
  }
);

const PerformanceChart = dynamic(
  () => import("@/components/portfolio/performance-chart").then((mod) => mod.PerformanceChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[250px] w-full rounded-lg" />,
  }
);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import type { Holding, AllocationItem, PortfolioSummary } from "@/types/portfolio";

const ALLOCATION_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1",
];

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newAssetType, setNewAssetType] = useState<"crypto" | "stock">("crypto");
  const [newQuantity, setNewQuantity] = useState("");
  const [newAvgPrice, setNewAvgPrice] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio/holdings");
      if (!res.ok) return;
      const data = await res.json();
      const mapped: Holding[] = (data.holdings ?? []).map((h: Record<string, unknown>) => ({
        id: h.id as string,
        userId: h.user_id ?? h.userId,
        symbol: h.symbol as string,
        assetType: (h.asset_type ?? h.assetType) as "crypto" | "stock",
        quantity: Number(h.quantity),
        avgBuyPrice: Number(h.avg_buy_price ?? h.avgBuyPrice),
        notes: h.notes as string | undefined,
        createdAt: new Date(h.created_at as string ?? h.createdAt as string),
        updatedAt: new Date(h.updated_at as string ?? h.updatedAt as string),
        // Mock current prices for now - would come from market data API
        currentPrice: Number(h.avg_buy_price ?? h.avgBuyPrice) * (1 + (Math.random() - 0.4) * 0.2),
      }));

      // Compute derived values
      for (const h of mapped) {
        if (h.currentPrice != null) {
          h.currentValue = h.quantity * h.currentPrice;
          const cost = h.quantity * h.avgBuyPrice;
          h.totalGainLoss = h.currentValue - cost;
          h.totalGainLossPercent = cost > 0 ? (h.totalGainLoss / cost) * 100 : 0;
        }
      }

      setHoldings(mapped);
    } catch {
      // Silently fail - user sees empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  async function handleAddHolding(e: React.FormEvent) {
    e.preventDefault();
    if (!newSymbol || !newQuantity || !newAvgPrice) return;

    setIsAdding(true);
    try {
      const res = await fetch("/api/portfolio/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: newSymbol.toUpperCase(),
          assetType: newAssetType,
          quantity: Number(newQuantity),
          avgBuyPrice: Number(newAvgPrice),
        }),
      });

      if (res.ok) {
        setNewSymbol("");
        setNewQuantity("");
        setNewAvgPrice("");
        setAddOpen(false);
        fetchHoldings();
      }
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDeleteHolding(id: string) {
    const res = await fetch(`/api/portfolio/holdings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setHoldings((prev) => prev.filter((h) => h.id !== id));
    }
  }

  async function handleRecordTransaction(data: {
    holdingId: string;
    type: "buy" | "sell";
    quantity: number;
    price: number;
    fee: number;
    executedAt: string;
  }) {
    const res = await fetch("/api/portfolio/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      fetchHoldings();
    }
  }

  // Compute summary
  const summary: PortfolioSummary = {
    totalValue: holdings.reduce((sum, h) => sum + (h.currentValue ?? 0), 0),
    totalCost: holdings.reduce((sum, h) => sum + h.quantity * h.avgBuyPrice, 0),
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    holdings,
    allocation: [],
  };
  summary.totalGainLoss = summary.totalValue - summary.totalCost;
  summary.totalGainLossPercent = summary.totalCost > 0 ? (summary.totalGainLoss / summary.totalCost) * 100 : 0;
  // Rough day change estimate
  summary.dayChange = summary.totalValue * (Math.random() - 0.4) * 0.03;
  summary.dayChangePercent = summary.totalValue > 0 ? (summary.dayChange / summary.totalValue) * 100 : 0;

  // Compute allocation
  const allocation: AllocationItem[] = holdings
    .filter((h) => (h.currentValue ?? 0) > 0)
    .map((h, i) => ({
      symbol: h.symbol,
      assetType: h.assetType,
      value: h.currentValue ?? 0,
      percentage: summary.totalValue > 0 ? ((h.currentValue ?? 0) / summary.totalValue) * 100 : 0,
      color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  // Mock performance data
  const performanceData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const base = summary.totalCost || 10000;
    const variation = base * (1 + (i / 30) * 0.1 + (Math.sin(i / 3) * 0.03));
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.round(variation * 100) / 100,
    };
  });

  const glFmt = formatPercent(summary.totalGainLossPercent);
  const dayFmt = formatPercent(summary.dayChangePercent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your holdings and performance
          </p>
        </div>
        <div className="flex gap-2">
          <RecordTransactionDialog
            holdings={holdings}
            onSubmit={handleRecordTransaction}
          />
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 size-4" />
                Add Holding
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Holding</DialogTitle>
                <DialogDescription>
                  Add a new asset to your portfolio.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddHolding} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="add-symbol">Symbol</Label>
                  <Input
                    id="add-symbol"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    placeholder="BTC, ETH, AAPL..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Asset Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newAssetType === "crypto" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setNewAssetType("crypto")}
                    >
                      Crypto
                    </Button>
                    <Button
                      type="button"
                      variant={newAssetType === "stock" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setNewAssetType("stock")}
                    >
                      Stock
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-quantity">Quantity</Label>
                    <Input
                      id="add-quantity"
                      type="number"
                      step="any"
                      min="0"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-price">Avg Buy Price</Label>
                    <Input
                      id="add-price"
                      type="number"
                      step="any"
                      min="0"
                      value={newAvgPrice}
                      onChange={(e) => setNewAvgPrice(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isAdding}>
                    {isAdding ? "Adding..." : "Add Holding"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="size-4" />
              Total Value
            </div>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums">
              {formatCurrency(summary.totalValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              {summary.totalGainLoss >= 0 ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
              Total Gain/Loss
            </div>
            <p className={cn("mt-1 text-2xl font-bold font-mono tabular-nums", glFmt.colorClass)}>
              {formatCurrency(summary.totalGainLoss)}
            </p>
            <p className={cn("text-sm", glFmt.colorClass)}>{glFmt.text}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              {summary.dayChange >= 0 ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
              Day Change
            </div>
            <p className={cn("mt-1 text-2xl font-bold font-mono tabular-nums", dayFmt.colorClass)}>
              {formatCurrency(summary.dayChange)}
            </p>
            <p className={cn("text-sm", dayFmt.colorClass)}>{dayFmt.text}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart3 className="size-4" />
              Holdings
            </div>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums">
              {holdings.length}
            </p>
            <p className="text-sm text-muted-foreground">
              {holdings.filter((h) => h.assetType === "crypto").length} crypto,{" "}
              {holdings.filter((h) => h.assetType === "stock").length} stocks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-md bg-secondary/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <HoldingsTable holdings={holdings} onDelete={handleDeleteHolding} />
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationChart data={allocation} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceChart data={performanceData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
