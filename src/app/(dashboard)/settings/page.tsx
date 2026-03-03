import { AlertsManagement } from "@/components/alerts/alerts-management";
import { SignalConfiguration } from "@/components/settings/signal-configuration";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your preferences
        </p>
      </div>

      <SignalConfiguration />
      <AlertsManagement />
    </div>
  );
}
