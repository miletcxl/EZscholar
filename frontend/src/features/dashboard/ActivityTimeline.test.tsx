import { render, screen } from '@testing-library/react';
import { ActivityTimeline } from './ActivityTimeline';
import type { ActivityEventDTO } from '../../services/api/types';

const events: ActivityEventDTO[] = [
  {
    id: 'evt-a',
    at: '2026-03-05T07:00:00Z',
    level: 'info',
    source: 'system',
    message: '较旧事件',
  },
  {
    id: 'evt-b',
    at: '2026-03-05T09:00:00Z',
    level: 'success',
    source: 'system',
    message: '最新事件',
  },
];

describe('ActivityTimeline', () => {
  it('renders events in descending time order', () => {
    render(<ActivityTimeline events={events} />);

    const items = screen.getAllByTestId('timeline-item');
    expect(items[0]).toHaveTextContent('最新事件');
    expect(items[1]).toHaveTextContent('较旧事件');
  });
});
