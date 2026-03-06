import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeatureCardGrid } from './FeatureCardGrid';
import { mockModuleSummaries } from '../../services/mock/data';

describe('FeatureCardGrid', () => {
  it('renders seven module cards with status badges', () => {
    render(
      <MemoryRouter>
        <FeatureCardGrid modules={mockModuleSummaries} />
      </MemoryRouter>,
    );

    const cards = screen.getAllByRole('link');
    expect(cards).toHaveLength(7);

    expect(screen.getByText('日程引擎')).toBeInTheDocument();
    expect(screen.getByText('幻灯片工坊')).toBeInTheDocument();
    expect(screen.getByText('科研大脑')).toBeInTheDocument();
    expect(screen.getAllByText(/健康|繁忙|预警|离线/).length).toBeGreaterThanOrEqual(1);
  });
});
