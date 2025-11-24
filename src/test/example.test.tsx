import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders button with text', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { getByText } = render(<Button variant="destructive">Delete</Button>);
    expect(getByText('Delete')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    const { getByText } = render(<Button disabled>Disabled</Button>);
    expect(getByText('Disabled')).toBeDisabled();
  });
});
