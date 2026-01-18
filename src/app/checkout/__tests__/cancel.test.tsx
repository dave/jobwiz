/**
 * Tests for checkout cancel page
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import CheckoutCancelPage from '../cancel/page';

describe('CheckoutCancelPage', () => {
  it('renders cancel message', () => {
    render(<CheckoutCancelPage />);

    expect(screen.getByText('Checkout Cancelled')).toBeInTheDocument();
    expect(screen.getByText(/Your checkout was cancelled/)).toBeInTheDocument();
    expect(screen.getByText(/No payment has been made/)).toBeInTheDocument();
  });

  it('has link to browse interview prep', () => {
    render(<CheckoutCancelPage />);

    const link = screen.getByRole('link', { name: 'Browse Interview Prep' });
    expect(link).toHaveAttribute('href', '/');
  });

  it('has contact link', () => {
    render(<CheckoutCancelPage />);

    const contactLink = screen.getByRole('link', { name: 'Contact us' });
    expect(contactLink).toHaveAttribute('href', '/contact');
  });

  it('has cancel icon', () => {
    render(<CheckoutCancelPage />);

    // Check for SVG icon
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('is styled as a centered card', () => {
    render(<CheckoutCancelPage />);

    const card = screen.getByText('Checkout Cancelled').closest('div');
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('rounded-lg');
  });
});
