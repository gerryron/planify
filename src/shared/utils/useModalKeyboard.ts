import { useEffect, useRef } from 'react';

interface UseModalKeyboardOptions {
  onClose: () => void;
  enabled?: boolean;
}

/**
 * Adds keyboard navigation to a modal:
 * - Escape closes the modal
 * - Tab / Shift+Tab cycle within the modal (focus trap)
 * - Auto-focuses the first focusable element on mount
 */
export function useModalKeyboard({
  onClose,
  enabled = true,
}: UseModalKeyboardOptions) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    // Auto-focus first focusable element
    const focusableSelector =
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements =
      container.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusableElements[0];
    if (firstFocusable) {
      // Small delay to ensure the modal is rendered before focusing
      requestAnimationFrame(() => firstFocusable.focus());
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        const currentFocusables =
          container.querySelectorAll<HTMLElement>(focusableSelector);
        if (currentFocusables.length === 0) return;

        const first = currentFocusables[0];
        const last = currentFocusables[currentFocusables.length - 1];

        if (event.shiftKey) {
          // Shift+Tab: wrap from first to last
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          // Tab: wrap from last to first
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onClose]);

  return { containerRef };
}
