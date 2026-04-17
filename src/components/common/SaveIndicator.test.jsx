import React from 'react';
import { render, screen } from '@testing-library/react';
import SaveIndicator from './SaveIndicator';

describe('SaveIndicator', () => {
  it('renders nothing when status is "idle"', () => {
    const { container } = render(<SaveIndicator status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "Saving..." text when status is "saving"', () => {
    render(<SaveIndicator status="saving" />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows "Saved" text when status is "saved"', () => {
    render(<SaveIndicator status="saved" />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows "Save failed" text when status is "error"', () => {
    render(<SaveIndicator status="error" />);
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('applies green styles for "saved" status', () => {
    const { container } = render(<SaveIndicator status="saved" />);
    expect(container.firstChild.className).toMatch(/green/);
  });

  it('applies red styles for "error" status', () => {
    const { container } = render(<SaveIndicator status="error" />);
    expect(container.firstChild.className).toMatch(/red/);
  });
});
