import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AnalyticsKPICards } from '../AnalyticsKPICards';
import type { AnalyticsData } from '@/hooks/useAnalyticsData';

// Mock language context
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

const mockData: AnalyticsData = {
  totalDeclarations: 150,
  monthlyGrowth: 12.5,
  weeklyGrowth: 5.0,
  avgProcessingDays: 3,
  completionRate: 85,
  pendingCount: 15,
  overdueCount: 2,
  statusDistribution: [],
  typeDistribution: [],
  monthlyTrend: [],
  weeklyActivity: [],
  topSenders: [],
  performanceMetrics: [],
  hourlyDistribution: [],
};

describe('AnalyticsKPICards', () => {
  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AnalyticsKPICards data={mockData} />
      </BrowserRouter>
    );
  };

  it('should render total declarations count', () => {
    renderComponent();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should render completion rate percentage', () => {
    renderComponent();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should render average processing days', () => {
    renderComponent();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render pending count', () => {
    renderComponent();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('should show overdue badge when there are delayed items', () => {
    renderComponent();
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('should display positive growth indicator', () => {
    renderComponent();
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });

  it('should have accessible labels', () => {
    renderComponent();
    const cards = screen.getAllByRole('region');
    expect(cards.length).toBe(4);
  });
});
