import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useUiStore } from '../stores/useUiStore';
import type { ReactNode } from 'react';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export function resetUiStore() {
  useUiStore.setState({
    isCommandPaletteOpen: false,
    toasts: [],
  });
}

export function renderWithRouter(ui: ReactNode, initialEntries: string[] = ['/']) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: ui,
      },
    ],
    { initialEntries },
  );

  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
