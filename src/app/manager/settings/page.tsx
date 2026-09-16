import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { StatusStepsManager } from "@/components/settings/status-steps-manager";

export default function ManagerSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile, default calendar timezone, and interview status pipeline.
        </p>
      </div>
      <AccountSettingsForm />
      <StatusStepsManager />
    </div>
  );
}
