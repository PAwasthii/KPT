import { useQuery, useMutation } from '@tanstack/react-query';
import { webhookService } from '../lib/api/services';
import { WebhookPayload, WebhookResponse } from '../lib/api/types';
import { config } from '../lib/config';

// Query keys
export const webhookKeys = {
  health: ['health'] as const,
  webhookTest: ['webhook', 'test'] as const,
};

// Health check hook — uses a raw fetch so it is fully decoupled from the
// apiClient interceptors (auth, CORS token injection, error logging).
// retry:0 means "Offline" appears immediately on first failure instead of
// waiting through React Query's exponential-backoff retry cycle.
export function useHealth() {
  return useQuery<{ status: string; database: string } | null>({
    queryKey: webhookKeys.health,
    queryFn: async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      try {
        const res = await fetch(`${config.apiUrl}/health`, {
          signal: ctrl.signal,
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return res.json() as Promise<{ status: string; database: string }>;
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    },
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 0,
  });
}

// Webhook test hook
export function useWebhookTest() {
  return useMutation({
    mutationFn: webhookService.testLandingiWebhook,
    meta: { successMessage: 'Webhook test triggered' },
  });
}

// Webhook payload submission hook
export function useWebhookSubmission() {
  return useMutation({
    mutationFn: (payload: WebhookPayload) => webhookService.handleLandingiWebhook(payload),
    meta: { successMessage: 'Webhook submitted' },
  });
}
