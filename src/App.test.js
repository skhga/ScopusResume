// src/App.test.js
// Note: jest.mock() hoisting requires babel-jest; our sucrase transformer does
// NOT hoist. We test the real app render path instead — the router loads the
// landing page, which contains the brand name.
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  test('renders without crashing and mounts the landing page', async () => {
    render(<App />);
    // Wait for the landing page to mount, then verify the brand name appears
    // somewhere in the document. The brand text is split across nested spans so
    // we check body.textContent rather than a specific node.
    await screen.findByRole('navigation');
    expect(document.body.textContent).toMatch(/scopus/i);
  });
});
