import { describe, it, expect } from 'vitest';
import { cleanArrayString, computeRecordUpdates, type ParsedRowData } from './data-ingest';

describe('cleanArrayString', () => {
  it('returns an empty string for null/undefined/empty-array-ish values', () => {
    expect(cleanArrayString(null)).toBe('');
    expect(cleanArrayString(undefined)).toBe('');
    expect(cleanArrayString('[]')).toBe('');
    expect(cleanArrayString('null')).toBe('');
  });

  it('flattens a JSON array string into a comma-separated value', () => {
    expect(cleanArrayString('["Keraniganj"]')).toBe('Keraniganj');
    expect(cleanArrayString('["Dhaka", "Mirpur"]')).toBe('Dhaka, Mirpur');
  });

  it('leaves an ordinary string untouched', () => {
    expect(cleanArrayString('Dhanmondi')).toBe('Dhanmondi');
  });
});

function baseIncoming(overrides: Partial<ParsedRowData> = {}): ParsedRowData {
  return {
    phone: '01712345678',
    email: '',
    providedFields: {},
    providedCustomFields: {},
    providedTags: [],
    ...overrides,
  };
}

describe('computeRecordUpdates', () => {
  it('reports no changes when nothing in the incoming row differs', () => {
    const matched = { name: 'Rahim', location: 'Dhaka' };
    const incoming = baseIncoming({ providedFields: { name: 'Rahim' } });

    const result = computeRecordUpdates(incoming, matched);
    expect(result.hasChanges).toBe(false);
    expect(result.updateFields).toEqual({});
  });

  it('updates a scalar field that genuinely changed', () => {
    const matched = { name: 'Rahim', location: 'Dhaka' };
    const incoming = baseIncoming({ providedFields: { location: 'Chittagong' } });

    const result = computeRecordUpdates(incoming, matched);
    expect(result.hasChanges).toBe(true);
    expect(result.updateFields.location).toBe('Chittagong');
    expect(result.diffs[0]).toMatchObject({ field: 'Location', from: 'Dhaka', to: 'Chittagong' });
  });

  it('never overwrites an existing value with an unmapped/absent field', () => {
    const matched = { name: 'Rahim', location: 'Dhaka' };
    // location intentionally not present in providedFields (unmapped/skipped column)
    const incoming = baseIncoming({ providedFields: { name: 'Rahim' } });

    const result = computeRecordUpdates(incoming, matched);
    expect(result.updateFields.location).toBeUndefined();
  });

  it('replaces a placeholder "User (...)" name with a real provided name', () => {
    const matched = { name: 'User (01712345678)' };
    const incoming = baseIncoming({ providedFields: { name: 'Rahim Uddin' } });

    const result = computeRecordUpdates(incoming, matched);
    expect(result.updateFields.name).toBe('Rahim Uddin');
  });

  it('merges new tags without duplicating existing ones', () => {
    const matched = { tags: ['VIP Client'] };
    const incoming = baseIncoming({ providedTags: ['VIP Client', 'WhatsApp Active'] });

    const result = computeRecordUpdates(incoming, matched);
    expect(result.hasChanges).toBe(true);
    expect(result.updateFields.tags).toEqual(['VIP Client', 'WhatsApp Active']);
  });

  it('only advances lastActive forward, never backward', () => {
    const matched = { lastActive: '2025-06-01T00:00:00.000Z' };
    const older = baseIncoming({ providedFields: { lastActive: '2025-01-01T00:00:00.000Z' } });
    const newer = baseIncoming({ providedFields: { lastActive: '2025-12-01T00:00:00.000Z' } });

    expect(computeRecordUpdates(older, matched).hasChanges).toBe(false);
    expect(computeRecordUpdates(newer, matched).updateFields.lastActive).toBeInstanceOf(Date);
  });
});
