// src/utils/validators.test.js
import { signUpSchema, signInSchema, personalInfoSchema } from './validators';

describe('signUpSchema', () => {
  const valid = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  };

  it('accepts valid data', () => {
    expect(() => signUpSchema.parse(valid)).not.toThrow();
  });

  it('rejects name shorter than 2 chars', () => {
    const result = signUpSchema.safeParse({ ...valid, name: 'J' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.name).toBeDefined();
  });

  it('rejects invalid email', () => {
    const result = signUpSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.email).toBeDefined();
  });

  it('rejects password shorter than 8 chars', () => {
    const result = signUpSchema.safeParse({ ...valid, password: 'short', confirmPassword: 'short' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.password).toBeDefined();
  });

  it('rejects mismatched passwords', () => {
    const result = signUpSchema.safeParse({ ...valid, confirmPassword: 'different' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined();
  });
});

describe('signInSchema', () => {
  it('accepts valid credentials', () => {
    expect(() => signInSchema.parse({ email: 'a@b.com', password: 'pw' })).not.toThrow();
  });

  it('rejects invalid email', () => {
    const result = signInSchema.safeParse({ email: 'bad', password: 'pw' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = signInSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('personalInfoSchema', () => {
  it('accepts valid personal info', () => {
    expect(() =>
      personalInfoSchema.parse({ fullName: 'John', email: 'j@ex.com', phone: '5551234' })
    ).not.toThrow();
  });

  it('rejects empty fullName', () => {
    const result = personalInfoSchema.safeParse({ fullName: '', email: 'j@ex.com', phone: '5551234' });
    expect(result.success).toBe(false);
  });

  it('rejects phone shorter than 7 chars', () => {
    const result = personalInfoSchema.safeParse({ fullName: 'John', email: 'j@ex.com', phone: '123' });
    expect(result.success).toBe(false);
  });
});
