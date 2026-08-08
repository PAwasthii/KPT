'use client';

import { useEffect, useState } from 'react';
import { settingsService } from '../lib/api/services';
import { useCurrency } from '../contexts/CurrencyContext';
import { useUpdateGlobalSetting } from '@/hooks/useSettings';

export default function CurrencySettings() {
    const [currencies, setCurrencies] = useState<any[]>([]);
    const { currency, updateCurrency } = useCurrency();
    const { mutate: updateSetting } = useUpdateGlobalSetting();

    useEffect(() => {
        const fetchCurrencies = async () => {
            const currencies = await settingsService.getCurrencies();
            setCurrencies(currencies);
        };

        fetchCurrencies();
    }, []);

    const handleCurrencyChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newCurrency = event.target.value;
        updateSetting({ key: 'currency', value: newCurrency });
        await updateCurrency(newCurrency);
    };

    return (
        <div>
            <h3 className="text-xl font-semibold mb-2">Currency</h3>
            <p className="text-sm text-muted-foreground mb-4">Set the global currency for the application.</p>
            <select value={currency} onChange={handleCurrencyChange} className="p-2 border rounded-md">
                {currencies.map(c => (
                    <option key={c.code} value={c.code}>
                        {c.name} ({c.symbol})
                    </option>
                ))}
            </select>
        </div>
    );
}
