'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        className: 'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
      }}
      closeButton
      richColors
    />
  );
}

export { toast } from 'sonner';
