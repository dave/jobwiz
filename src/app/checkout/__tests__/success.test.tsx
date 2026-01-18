/**
 * Tests for checkout success page
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/navigation
const mockSearchParams = new Map<string, string>();
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) ?? null,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

import { CheckoutSuccessContent } from '../success/CheckoutSuccessContent';

describe('CheckoutSuccessContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.clear();
  });

  it('shows error when no session ID provided', async () => {
    render(<CheckoutSuccessContent />);

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('No session ID provided')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching session', () => {
    mockSearchParams.set('session_id', 'cs_test_123');
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<CheckoutSuccessContent />);

    expect(screen.getByText('Verifying your purchase...')).toBeInTheDocument();
  });

  it('shows success state for paid session', async () => {
    mockSearchParams.set('session_id', 'cs_test_123');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        session: {
          id: 'cs_test_123',
          customer_email: 'test@example.com',
          payment_status: 'paid',
          company_slug: 'google',
          role_slug: 'software-engineer',
          amount_total: 20000,
          currency: 'usd',
        },
      }),
    });

    render(<CheckoutSuccessContent />);

    await waitFor(() => {
      expect(screen.getByText('Purchase Complete!')).toBeInTheDocument();
    });
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    expect(screen.getByText('Start Your Interview Prep')).toBeInTheDocument();
  });

  it('shows pending state for unpaid session', async () => {
    mockSearchParams.set('session_id', 'cs_test_123');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        session: {
          id: 'cs_test_123',
          customer_email: null,
          payment_status: 'unpaid',
          company_slug: 'google',
          role_slug: 'software-engineer',
          amount_total: 20000,
          currency: 'usd',
        },
      }),
    });

    render(<CheckoutSuccessContent />);

    await waitFor(() => {
      expect(screen.getByText('Payment Pending')).toBeInTheDocument();
    });
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    mockSearchParams.set('session_id', 'cs_test_123');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Session not found' }),
    });

    render(<CheckoutSuccessContent />);

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Session not found')).toBeInTheDocument();
    });
  });

  it('links to correct journey URL', async () => {
    mockSearchParams.set('session_id', 'cs_test_123');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        session: {
          id: 'cs_test_123',
          customer_email: null,
          payment_status: 'paid',
          company_slug: 'amazon',
          role_slug: 'product-manager',
          amount_total: 20000,
          currency: 'usd',
        },
      }),
    });

    render(<CheckoutSuccessContent />);

    await waitFor(() => {
      expect(screen.getByText('Start Your Interview Prep')).toBeInTheDocument();
    });
    const link = screen.getByRole('link', { name: 'Start Your Interview Prep' });
    expect(link).toHaveAttribute('href', '/amazon/product-manager/journey');
  });

  it('links to dashboard when no company/role', async () => {
    mockSearchParams.set('session_id', 'cs_test_123');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        session: {
          id: 'cs_test_123',
          customer_email: null,
          payment_status: 'paid',
          company_slug: null,
          role_slug: null,
          amount_total: 20000,
          currency: 'usd',
        },
      }),
    });

    render(<CheckoutSuccessContent />);

    await waitFor(() => {
      expect(screen.getByText('Start Your Interview Prep')).toBeInTheDocument();
    });
    const link = screen.getByRole('link', { name: 'Start Your Interview Prep' });
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('formats currency correctly', async () => {
    mockSearchParams.set('session_id', 'cs_test_123');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        session: {
          id: 'cs_test_123',
          customer_email: null,
          payment_status: 'paid',
          company_slug: 'google',
          role_slug: 'software-engineer',
          amount_total: 19999,
          currency: 'usd',
        },
      }),
    });

    render(<CheckoutSuccessContent />);

    await waitFor(() => {
      expect(screen.getByText('$199.99')).toBeInTheDocument();
    });
  });

  it('shows order ID snippet', async () => {
    mockSearchParams.set('session_id', 'cs_test_123');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        session: {
          id: 'cs_test_12345678',
          customer_email: null,
          payment_status: 'paid',
          company_slug: 'google',
          role_slug: 'software-engineer',
          amount_total: 20000,
          currency: 'usd',
        },
      }),
    });

    render(<CheckoutSuccessContent />);

    await waitFor(() => {
      expect(screen.getByText('Order ID: 12345678')).toBeInTheDocument();
    });
  });
});
