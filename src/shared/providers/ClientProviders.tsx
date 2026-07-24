'use client';

import { type ReactNode } from 'react';
import { ConfirmDialogProvider } from '@/shared/ui/ConfirmDialog';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <ConfirmDialogProvider>{children}</ConfirmDialogProvider>;
}
