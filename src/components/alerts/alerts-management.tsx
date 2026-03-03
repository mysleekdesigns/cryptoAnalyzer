"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Trash2Icon, BellIcon, BellOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlertStore, type PriceAlert } from "@/lib/store/alert-store";
import { CreateAlertDialog } from "./create-alert-dialog";

function AlertRow({ alert }: { alert: PriceAlert }) {
  const { toggleAlert, deleteAlert } = useAlertStore();

  const handleToggle = async () => {
    await toggleAlert(alert.id, !alert.isActive);
    toast.success(
      alert.isActive ? "Alert paused" : "Alert reactivated"
    );
  };

  const handleDelete = async () => {
    await deleteAlert(alert.id);
    toast.success("Alert deleted");
  };

  const isTriggered = !!alert.triggeredAt;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium uppercase">{alert.symbol}</span>
          <Badge variant="outline">
            {alert.assetType}
          </Badge>
          {isTriggered ? (
            <Badge variant="default">Triggered</Badge>
          ) : alert.isActive ? (
            <Badge variant="secondary">Active</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Paused
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Price {alert.condition}{" "}
          <span className="font-mono">
            ${parseFloat(alert.targetPrice).toLocaleString()}
          </span>
          {isTriggered && alert.triggeredAt && (
            <span className="ml-2">
              - Triggered {new Date(alert.triggeredAt).toLocaleDateString()}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!isTriggered && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            title={alert.isActive ? "Pause alert" : "Reactivate alert"}
          >
            {alert.isActive ? (
              <BellIcon className="size-4" />
            ) : (
              <BellOffIcon className="size-4" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          title="Delete alert"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function AlertsManagement() {
  const { alerts, isLoading, error, fetchAlerts } = useAlertStore();

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Price Alerts</CardTitle>
        <CreateAlertDialog />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No price alerts yet. Create one to get notified when an asset
            reaches your target price.
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
