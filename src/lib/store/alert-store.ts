import { create } from "zustand";

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  assetType: string;
  condition: string;
  targetPrice: string;
  isActive: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

interface AlertState {
  alerts: PriceAlert[];
  isLoading: boolean;
  error: string | null;
  setAlerts: (alerts: PriceAlert[]) => void;
  addAlert: (alert: PriceAlert) => void;
  updateAlert: (id: string, updates: Partial<PriceAlert>) => void;
  removeAlert: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchAlerts: () => Promise<void>;
  createAlert: (data: {
    symbol: string;
    assetType: string;
    condition: string;
    targetPrice: number;
  }) => Promise<PriceAlert | null>;
  toggleAlert: (id: string, isActive: boolean) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  checkAlerts: () => Promise<PriceAlert[]>;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  isLoading: false,
  error: null,

  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts] })),
  updateAlert: (id, updates) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  removeAlert: (id) =>
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const data = await res.json();
      set({ alerts: data.alerts, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch alerts",
        isLoading: false,
      });
    }
  },

  createAlert: async (data) => {
    set({ error: null });
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create alert");
      }
      const { alert } = await res.json();
      get().addAlert(alert);
      return alert;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to create alert",
      });
      return null;
    }
  },

  toggleAlert: async (id, isActive) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      if (!res.ok) throw new Error("Failed to update alert");
      const { alert } = await res.json();
      get().updateAlert(id, alert);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update alert",
      });
    }
  },

  deleteAlert: async (id) => {
    try {
      const res = await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete alert");
      get().removeAlert(id);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to delete alert",
      });
    }
  },

  checkAlerts: async () => {
    try {
      const res = await fetch("/api/alerts/check");
      if (!res.ok) return [];
      const data = await res.json();
      // Refresh the full list after checking
      if (data.triggered.length > 0) {
        get().fetchAlerts();
      }
      return data.triggered;
    } catch {
      return [];
    }
  },
}));
