import { describe, it, expect } from 'vitest';
import { cleanArrayString, computeRecordUpdates, parseRowData, type ParsedRowData } from './data-ingest';

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

describe('parseRowData — column mapping correctness', () => {
  it('respects an explicit "skip" mapping and never pulls that column into phone (regression)', () => {
    // "Order ID" is explicitly skipped but contains a 10-digit number that
    // could be mistaken for a phone number. The row's actual mapped phone
    // column is empty for this row.
    const row = { Phone: '', 'Order ID': '9988776655', Name: 'Karim' };
    const mapping = { Phone: 'phone', 'Order ID': 'skip', Name: 'name' };

    const result = parseRowData(row, mapping);
    expect(result.phone).toBe('');
    expect(result.providedFields.orderId).toBeUndefined();
  });

  it('normalizes a mapped phone column to the local 0-prefixed form', () => {
    const row = { Mobile: '+8801712345678' };
    const mapping = { Mobile: 'phone' };

    const result = parseRowData(row, mapping);
    expect(result.phone).toBe('01712345678');
  });

  it('still auto-detects a phone-shaped column when there is no explicit mapping at all', () => {
    const row = { Contact: '01712345678', Name: 'Karim' };

    const result = parseRowData(row); // no columnMapping -> heuristic + fallback path
    expect(result.phone).toBe('01712345678');
  });

  it('never leaks a skipped column\'s value into providedFields under any target name', () => {
    const row = { Phone: '01712345678', Notes: 'internal note, ignore me' };
    const mapping = { Phone: 'phone', Notes: 'skip' };

    const result = parseRowData(row, mapping);
    expect(Object.values(result.providedFields)).not.toContain('internal note, ignore me');
    expect(Object.values(result.providedCustomFields)).not.toContain('internal note, ignore me');
  });
});
