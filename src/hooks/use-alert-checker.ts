"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAlertStore } from "@/lib/store/alert-store";

const CHECK_INTERVAL_MS = 60_000;

export function useAlertChecker() {
  const checkAlerts = useAlertStore((s) => s.checkAlerts);
  const checkAlertsRef = useRef(checkAlerts);
  checkAlertsRef.current = checkAlerts;

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function runCheck() {
      if (document.visibilityState !== "visible") return;
      const triggered = await checkAlertsRef.current();
      for (const alert of triggered) {
        toast.success(
          `Alert triggered: ${alert.symbol.toUpperCase()} went ${alert.condition} $${parseFloat(alert.targetPrice).toLocaleString()}`,
          { duration: 10_000 }
        );
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        runCheck();
      }
    }

    intervalId = setInterval(runCheck, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
