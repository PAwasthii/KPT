import CurrencySettings from "@/components/currency-settings";
import DiscountThresholdSettings from "@/components/discount-threshold-settings";

export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <hr />
      <br />
      <div className="space-y-8">
        <CurrencySettings />
        <DiscountThresholdSettings />
      </div>
    </div>
  );
}
