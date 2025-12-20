import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnalyticsData } from '../useAnalyticsData';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        is: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: '1',
                    status: 'archived',
                    type: 'دخول',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    sender: { username: 'testuser' },
                  },
                  {
                    id: '2',
                    status: 'pending_warehouse_signature',
                    type: 'خروج',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    sender: { username: 'testuser2' },
                  },
                ],
                error: null,
              })
            ),
          })),
        })),
      })),
    })),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock language context
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAnalyticsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAnalyticsData('6months'), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.data.totalDeclarations).toBe(0);
  });

  it('should load analytics data successfully', async () => {
    const { result } = renderHook(() => useAnalyticsData('6months'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.loadAnalytics();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data.totalDeclarations).toBe(2);
    expect(result.current.data.statusDistribution.length).toBeGreaterThan(0);
    expect(result.current.data.typeDistribution.length).toBe(2);
  });

  it('should calculate completion rate correctly', async () => {
    const { result } = renderHook(() => useAnalyticsData('6months'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.loadAnalytics();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 1 archived out of 2 = 50%
    expect(result.current.data.completionRate).toBe(50);
  });

  it('should count pending declarations', async () => {
    const { result } = renderHook(() => useAnalyticsData('6months'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.loadAnalytics();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 1 pending_warehouse_signature
    expect(result.current.data.pendingCount).toBe(1);
  });

  it('should identify top senders', async () => {
    const { result } = renderHook(() => useAnalyticsData('6months'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.loadAnalytics();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data.topSenders.length).toBeGreaterThan(0);
    expect(result.current.data.topSenders[0].username).toBeDefined();
  });
});
