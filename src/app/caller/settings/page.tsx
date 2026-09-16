import { AccountSettingsForm } from "@/components/settings/account-settings-form";

export default function CallerSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile and calendar preferences.
        </p>
      </div>
      <AccountSettingsForm />
    </div>
  );
}
