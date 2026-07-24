import { toast } from 'sonner';

/**
 * Wraps an async function with toast notifications for success and error.
 * Returns the result on success, or `undefined` on error.
 *
 * Reduces try-catch boilerplate in form components from:
 * ```
 * try { await service.action(data); toast.success('Done'); onSuccess?.(); }
 * catch { toast.error('Failed'); }
 * ```
 * to:
 * ```
 * const result = await asyncToast(() => service.action(data), { success: 'Done', error: 'Failed' });
 * if (result) onSuccess?.();
 * ```
 */
export async function asyncToast<T>(
  fn: () => Promise<T>,
  options: { success: string; error: string },
): Promise<T | undefined> {
  try {
    const result = await fn();
    toast.success(options.success);
    return result;
  } catch {
    toast.error(options.error);
    return undefined;
  }
}
