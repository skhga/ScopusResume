// src/App.test.js
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the full router so we don't need Supabase/AuthContext in tests.
// babel-jest hoists jest.mock() above imports automatically.
jest.mock('./router', () => {
  const React = require('react');
  const { createMemoryRouter } = require('react-router-dom');
  return {
    __esModule: true,
    default: createMemoryRouter([
      { path: '/', element: React.createElement('div', null, 'ScopusResume') },
    ]),
  };
});

describe('App', () => {
  test('renders without crashing', async () => {
    render(<App />);
    expect(await screen.findByText('ScopusResume')).toBeInTheDocument();
  });
});
