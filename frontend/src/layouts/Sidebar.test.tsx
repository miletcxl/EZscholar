import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('shows active nav and supports route navigation', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/activity']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <Sidebar />
                <div data-testid="route-indicator">route</div>
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const activityLink = screen.getByRole('link', { name: /活动时间线/i });
    expect(activityLink).toHaveClass('active');

    await user.click(screen.getByRole('link', { name: /总览/i }));

    const homeLink = screen.getByRole('link', { name: /总览/i });
    expect(homeLink).toHaveClass('active');
  });
});
