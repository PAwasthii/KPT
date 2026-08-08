"use client";

import { toast as sonner } from "sonner";
import { parseApiError } from "./api/errorHandler";

type ToastOptions = {
  description?: string;
  duration?: number;
};

export const toast = {
  success(title: string, options: ToastOptions = {}) {
    return sonner.success(title, options);
  },
  error(error: unknown, fallbackTitle = "Something went wrong", options: ToastOptions = {}) {
    const parsed = parseApiError(error);
    const title = parsed?.title || fallbackTitle;
    const description = parsed?.message;
    return sonner.error(title, { description, ...options });
  },
  info(title: string, options: ToastOptions = {}) {
    return sonner.info(title, options);
  },
  warning(title: string, options: ToastOptions = {}) {
    // Sonner v1.7/v2 expose warning via toast.warning in most builds; fallback to info
    const anySonner: any = sonner as any;
    if (typeof anySonner.warning === 'function') {
      return anySonner.warning(title, options);
    }
    return sonner.info(title, options);
  },
  /**
   * Wrap a promise with loading/success/error toasts.
   * Backward compatible with previous signature.
   *
   * Examples:
   *  - toast.promise(apiCall(), { loading: 'Loading', success: 'Done', error: 'Failed' }, { duration: 5000 })
   *  - toast.promise(apiCall(), { loading: 'Loading', success: (res) => `Done: ${res.count}`, error: 'Failed' }, { duration: 5000 })
   */
  promise<T>(
    promise: Promise<T>,
    messages:
      | { loading: string; success: string | ((value: T) => string); error: string | ((error: unknown) => string) }
      | ((value: T) => { success?: string } | string),
    _options: ToastOptions = {}
  ) {
    // If messages is a function, we assume success text will be resolved dynamically
    if (typeof messages === 'function') {
      return sonner.promise(promise, {
        loading: 'Loading...',
        success: (val: T) => {
          const res = messages(val);
          return typeof res === 'string' ? res : res.success || 'Success';
        },
        error: 'Something went wrong',
      });
    }
    return sonner.promise(promise, messages as any);
  },
};

export async function withActionToast<T>(
  action: Promise<T> | (() => Promise<T>),
  messages:
    | { loading: string; success: string | ((value: T) => string); error: string | ((error: unknown) => string) }
    | ((value: T) => { success?: string } | string),
  _options: ToastOptions = {}
) {
  const run = typeof action === "function" ? (action as () => Promise<T>) : () => action as Promise<T>;
  return toast.promise(run(), messages as any);
}


