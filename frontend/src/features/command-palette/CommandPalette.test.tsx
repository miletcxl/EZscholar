import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { useUiStore } from '../../stores/useUiStore';

function LocationMarker() {
  const location = useLocation();
  return <div data-testid="location-marker">{location.pathname}</div>;
}

function TestShell() {
  const open = useUiStore((state) => state.openCommandPalette);

  useEffect(() => {
    open();
  }, [open]);

  return (
    <>
      <LocationMarker />
      <CommandPalette />
    </>
  );
}

describe('CommandPalette', () => {
  it('filters commands and executes keyboard enter navigation', async () => {
    const user = userEvent.setup();
    useUiStore.setState({ isCommandPaletteOpen: false, toasts: [] });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <TestShell />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const input = await screen.findByTestId('command-search');
    await user.type(input, 'Research');

    expect(await screen.findByText('跳转到 Research Brain')).toBeInTheDocument();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('location-marker')).toHaveTextContent('/modules/research-brain');
    });
  });
});
