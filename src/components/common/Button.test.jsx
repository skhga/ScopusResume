import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

// framer-motion uses CSS transforms/animations that don't work in jsdom.
// Mock it to render plain HTML elements instead.
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      button: React.forwardRef(
        ({ children, whileHover, whileTap, onHoverStart, onHoverEnd,
           animate, initial, variants, transition, ...props }, ref) =>
          React.createElement('button', { ...props, ref }, children)
      ),
      span: ({ children, animate, initial, transition, ...props }) =>
        React.createElement('span', props, children),
    },
  };
});

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('is disabled when loading=true', () => {
    render(<Button loading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    const handleClick = jest.fn();
    render(<Button loading onClick={handleClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with type="submit" when specified', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('applies danger variant class', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/red/);
  });
});
