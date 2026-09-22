import { describe, it, expect } from 'vitest';
import { buildPhonePrefixRegex } from './phone';

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
