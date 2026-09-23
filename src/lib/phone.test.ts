import { describe, it, expect } from 'vitest';
import { buildPhonePrefixRegex, normalizePhone } from './phone';

function matches(pattern: string, value: string): boolean {
  return new RegExp(pattern).test(value);
}

describe('buildPhonePrefixRegex', () => {
  it('returns an empty string for an empty prefix', () => {
    expect(buildPhonePrefixRegex('')).toBe('');
  });

  it('matches all common notations for a local-format prefix (017)', () => {
    const pattern = buildPhonePrefixRegex('017');
    expect(matches(pattern, '01712345678')).toBe(true);
    expect(matches(pattern, '+8801712345678')).toBe(true);
    expect(matches(pattern, '8801712345678')).toBe(true);
  });

  it('matches all common notations for a country-code-format prefix (88018)', () => {
    const pattern = buildPhonePrefixRegex('88018');
    expect(matches(pattern, '01812345678')).toBe(true);
    expect(matches(pattern, '+8801812345678')).toBe(true);
    expect(matches(pattern, '8801812345678')).toBe(true);
  });

  it('matches a bare 2-digit operator code (19) regardless of prefix notation', () => {
    const pattern = buildPhonePrefixRegex('19');
    expect(matches(pattern, '01912345678')).toBe(true);
    expect(matches(pattern, '+8801912345678')).toBe(true);
  });

  it('does not match a different operator prefix', () => {
    const pattern = buildPhonePrefixRegex('017');
    expect(matches(pattern, '01812345678')).toBe(false);
  });

  it('strips spaces, dashes and parentheses before building the pattern', () => {
    const pattern = buildPhonePrefixRegex('+880 17-123');
    expect(matches(pattern, '01712399999')).toBe(true);
  });
});

describe('normalizePhone', () => {
  it('canonicalizes +880, 880 and bare-10-digit variants to the local 0-prefixed form', () => {
    expect(normalizePhone('+8801712345678')).toBe('01712345678');
    expect(normalizePhone('8801712345678')).toBe('01712345678');
    expect(normalizePhone('1712345678')).toBe('01712345678');
    expect(normalizePhone('01712345678')).toBe('01712345678');
  });

  it('strips spaces, dashes and parentheses before normalizing', () => {
    expect(normalizePhone('+880 171-234 5678')).toBe('01712345678');
    expect(normalizePhone('(017) 1234-5678')).toBe('01712345678');
  });

  it('treats the same real number as identical regardless of input format', () => {
    const variants = ['01912345678', '+8801912345678', '8801912345678', '1912345678'];
    const normalized = new Set(variants.map(normalizePhone));
    expect(normalized.size).toBe(1);
  });

  it('leaves non-Bangladeshi-mobile-shaped input unchanged rather than guessing', () => {
    expect(normalizePhone('12345')).toBe('12345');
    expect(normalizePhone('029876543')).toBe('029876543'); // landline-shaped, not touched
    expect(normalizePhone('+14155552671')).toBe('14155552671'); // US number, only leading + stripped
  });

  it('returns an empty string for empty input', () => {
    expect(normalizePhone('')).toBe('');
  });
});
