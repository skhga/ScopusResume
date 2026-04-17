// src/utils/formatters.test.js
import {
  formatDate,
  formatPhoneNumber,
  truncateText,
  capitalizeFirst,
  generateResumeId,
} from './formatters';

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('');
  });

  it('formats a valid ISO date string', () => {
    const result = formatDate('2024-03-15');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('accepts a Date object', () => {
    const d = new Date(2024, 2, 15); // March 15 2024
    const result = formatDate(d);
    expect(typeof result).toBe('string');
    expect(result).toContain('2024');
  });
});

describe('formatPhoneNumber', () => {
  it('returns empty string for null', () => {
    expect(formatPhoneNumber(null)).toBe('');
  });

  it('formats a 10-digit number', () => {
    expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
  });

  it('strips spaces and dashes before formatting', () => {
    expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
  });

  it('returns original string if not 10 digits', () => {
    expect(formatPhoneNumber('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  });
});

describe('truncateText', () => {
  it('returns empty string for null', () => {
    expect(truncateText(null)).toBe('');
  });

  it('returns the string unchanged if within maxLength', () => {
    expect(truncateText('short', 100)).toBe('short');
  });

  it('truncates and appends ellipsis', () => {
    const result = truncateText('Hello World', 5);
    expect(result).toMatch(/\.\.\.$/);
    expect(result.length).toBeLessThanOrEqual(8); // 5 chars + '...'
  });

  it('defaults to 100 characters', () => {
    const long = 'a'.repeat(120);
    const result = truncateText(long);
    expect(result).toMatch(/\.\.\.$/);
    expect(result.length).toBeLessThanOrEqual(103);
  });
});

describe('capitalizeFirst', () => {
  it('returns empty string for null', () => {
    expect(capitalizeFirst(null)).toBe('');
  });

  it('capitalizes the first character', () => {
    expect(capitalizeFirst('hello world')).toBe('Hello world');
  });

  it('leaves an already-capitalized string unchanged', () => {
    expect(capitalizeFirst('React')).toBe('React');
  });
});

describe('generateResumeId', () => {
  it('returns a string starting with "resume_"', () => {
    expect(generateResumeId()).toMatch(/^resume_/);
  });

  it('generates unique IDs on consecutive calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateResumeId()));
    expect(ids.size).toBe(20);
  });
});
