import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeatureCardGrid } from './FeatureCardGrid';
import { mockModuleSummaries } from '../../services/mock/data';

describe('FeatureCardGrid', () => {
  it('renders six module cards with status badges', () => {
    render(
      <MemoryRouter>
        <FeatureCardGrid modules={mockModuleSummaries} />
      </MemoryRouter>,
    );

    const cards = screen.getAllByRole('link');
    expect(cards).toHaveLength(6);

    expect(screen.getByText('Deadline Engine')).toBeInTheDocument();
    expect(screen.getByText('Research Brain')).toBeInTheDocument();
    expect(screen.getAllByText(/健康|繁忙|预警|离线/).length).toBeGreaterThanOrEqual(1);
  });
});
