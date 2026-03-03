"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAlertStore } from "@/lib/store/alert-store";

export function CreateAlertDialog() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [assetType, setAssetType] = useState<string>("crypto");
  const [condition, setCondition] = useState<string>("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createAlert = useAlertStore((s) => s.createAlert);

  const resetForm = () => {
    setSymbol("");
    setAssetType("crypto");
    setCondition("above");
    setTargetPrice("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseFloat(targetPrice);
    if (!symbol.trim()) {
      toast.error("Please enter a symbol");
      return;
    }
    if (isNaN(price) || price <= 0) {
      toast.error("Target price must be a positive number");
      return;
    }

    setIsSubmitting(true);
    const alert = await createAlert({
      symbol: symbol.trim().toLowerCase(),
      assetType,
      condition,
      targetPrice: price,
    });
    setIsSubmitting(false);

    if (alert) {
      toast.success(
        `Alert created: ${alert.symbol.toUpperCase()} ${condition} $${price}`
      );
      resetForm();
      setOpen(false);
    } else {
      toast.error("Failed to create alert");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Alert</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Price Alert</DialogTitle>
          <DialogDescription>
            Get notified when an asset reaches your target price.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g. bitcoin, AAPL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="assetType">Asset Type</Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger id="assetType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="condition">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger id="condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Price goes above</SelectItem>
                  <SelectItem value="below">Price goes below</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="targetPrice">Target Price (USD)</Label>
            <Input
              id="targetPrice"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
