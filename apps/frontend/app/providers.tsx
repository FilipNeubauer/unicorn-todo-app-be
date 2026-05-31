"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { ToastProvider } from "@/components/Toast";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: true,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ToastProvider>
  );
}
