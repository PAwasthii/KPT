'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import Cookies from 'js-cookie';
import { settingsService } from '../lib/api/services';

export const MAJOR_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
] as const;

export type CurrencyEntry = { code: string; symbol: string; name: string };

// Approximate fallback rates relative to INR (1 INR = X foreign)
const FALLBACK_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
  JPY: 1.77,
  AED: 0.044,
  SGD: 0.016,
  AUD: 0.019,
  CAD: 0.017,
  CHF: 0.011,
  CNY: 0.087,
  SAR: 0.045,
};

interface CurrencyContextType {
  currency: string;
  symbol: string;
  currencies: CurrencyEntry[];
  rates: Record<string, number>;
  ratesLoading: boolean;
  /** Convert an amount stored in INR to the currently selected currency */
  convert: (amount: number) => number;
  updateCurrency: (newCurrency: string) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState('INR');
  const [symbol, setSymbol] = useState('₹');
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Fetch live exchange rates (base = INR) once on mount
  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);
    fetch('https://open.er-api.com/v6/latest/INR')
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.result === 'success' && data.rates) {
          setRates({ INR: 1, ...data.rates });
        }
      })
      .catch(() => {
        // silently use fallback rates
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const resolveSymbol = useCallback(async (code: string): Promise<string> => {
    const local = MAJOR_CURRENCIES.find(c => c.code === code);
    if (local) return local.symbol;
    try {
      const list = await settingsService.getCurrencies();
      const found = list.find((c: { code: string; symbol: string }) => c.code === code);
      return found?.symbol ?? code;
    } catch {
      return code;
    }
  }, []);

  const fetchGlobalCurrency = useCallback(async () => {
    const token = Cookies.get('auth_token');
    if (!token) return;
    try {
      const settings = await settingsService.getGlobalSettings();
      if (settings.defaultCurrency) {
        setCurrency(settings.defaultCurrency);
        const sym = await resolveSymbol(settings.defaultCurrency);
        setSymbol(sym);
      }
    } catch {
      // Silently fail - use default currency
    }
  }, [resolveSymbol]);

  useEffect(() => {
    fetchGlobalCurrency();
  }, [fetchGlobalCurrency]);

  const updateCurrency = async (newCurrency: string) => {
    setCurrency(newCurrency);
    const sym = await resolveSymbol(newCurrency);
    setSymbol(sym);
  };

  /** Convert amount from INR (base) to the currently selected currency */
  const convert = useCallback((amount: number): number => {
    const rate = rates[currency] ?? 1;
    return amount * rate;
  }, [rates, currency]);

  return (
    <CurrencyContext.Provider value={{
      currency,
      symbol,
      currencies: MAJOR_CURRENCIES as unknown as CurrencyEntry[],
      rates,
      ratesLoading,
      convert,
      updateCurrency,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
