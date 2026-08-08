'use client';

import { useState, useEffect } from 'react';
import { useGlobalSettings, useUpdateGlobalSetting } from '@/hooks/useSettings';

export default function DiscountThresholdSettings() {
  const { data: settings, isLoading, isError } = useGlobalSettings();
  const { mutate: updateSetting, isPending } = useUpdateGlobalSetting();

  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (settings?.OPPORTUNITY_DISCOUNT_THRESHOLD !== undefined) {
      setInputValue(settings.OPPORTUNITY_DISCOUNT_THRESHOLD);
    }
  }, [settings?.OPPORTUNITY_DISCOUNT_THRESHOLD]);

  const handleSave = () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) return;
    updateSetting({ key: 'OPPORTUNITY_DISCOUNT_THRESHOLD', value: String(parsed) });
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Opportunity Discount Threshold</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Opportunities with a line-item discount exceeding this value will require manager approval.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {isError && <p className="text-sm text-destructive">Failed to load settings.</p>}

      {!isLoading && !isError && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="p-2 pr-8 border rounded-md w-32"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}
