"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import type { Holding } from "@/types/portfolio";

interface RecordTransactionDialogProps {
  holdings: Holding[];
  onSubmit: (data: {
    holdingId: string;
    type: "buy" | "sell";
    quantity: number;
    price: number;
    fee: number;
    executedAt: string;
  }) => Promise<void>;
}

export function RecordTransactionDialog({ holdings, onSubmit }: RecordTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [holdingId, setHoldingId] = useState("");
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fee, setFee] = useState("0");
  const [executedAt, setExecutedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setHoldingId("");
    setType("buy");
    setQuantity("");
    setPrice("");
    setFee("0");
    setExecutedAt(new Date().toISOString().slice(0, 16));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!holdingId || !quantity || !price) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        holdingId,
        type,
        quantity: Number(quantity),
        price: Number(price),
        fee: Number(fee) || 0,
        executedAt,
      });
      reset();
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 size-4" />
          Record Transaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Transaction</DialogTitle>
          <DialogDescription>
            Log a buy or sell transaction for one of your holdings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tx-holding">Asset</Label>
            <select
              id="tx-holding"
              value={holdingId}
              onChange={(e) => setHoldingId(e.target.value)}
              required
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">Select an asset...</option>
              {holdings.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.symbol} ({h.assetType})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "buy" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setType("buy")}
              >
                Buy
              </Button>
              <Button
                type="button"
                variant={type === "sell" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setType("sell")}
              >
                Sell
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tx-quantity">Quantity</Label>
              <Input
                id="tx-quantity"
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-price">Price</Label>
              <Input
                id="tx-price"
                type="number"
                step="any"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tx-fee">Fee</Label>
              <Input
                id="tx-fee"
                type="number"
                step="any"
                min="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="datetime-local"
                value={executedAt}
                onChange={(e) => setExecutedAt(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !holdingId}>
              {isSubmitting ? "Saving..." : "Save Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
