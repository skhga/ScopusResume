import '@testing-library/jest-dom';

// react-router-dom v7 uses TextEncoder/TextDecoder which jsdom doesn't expose.
const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

// Supabase createClient throws when URL is empty; provide dummy values for tests.
if (!process.env.REACT_APP_SUPABASE_URL) {
  process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
}
if (!process.env.REACT_APP_SUPABASE_ANON_KEY) {
  process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-anon-key';
}

// framer-motion uses IntersectionObserver + ResizeObserver + matchMedia which
// jsdom does not implement. Stub them so component tests don't crash.
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
