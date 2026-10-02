import { describe, it, expect } from 'vitest';
import { validateOperation, formatCell, formatNumber, errorMessage } from './operations';
describe('cleaning inputs', () => {
  it('requires a selected numeric column', () =>
    expect(() => validateOperation({ operation: 'fill_mean' })).toThrow());
  it('requires a replacement value', () =>
    expect(() =>
      validateOperation({ operation: 'fill_category', column: 'City', value: '  ' }),
    ).toThrow());
  it('limits renamed headers', () =>
    expect(() =>
      validateOperation({ operation: 'rename_column', column: 'City', value: 'a'.repeat(81) }),
    ).toThrow());
  it('requires columns before removal', () =>
    expect(() => validateOperation({ operation: 'drop_columns', columns: [] })).toThrow('Choose'));
  it('requires a conversion target', () =>
    expect(() => validateOperation({ operation: 'convert_type', column: 'Price' })).toThrow());
  it('allows all-column trimming', () =>
    expect(validateOperation({ operation: 'trim_whitespace', columns: [] })).toEqual({
      operation: 'trim_whitespace',
      columns: [],
    }));
  it('preserves meaningful categorical whitespace for server validation', () =>
    expect(
      validateOperation({ operation: 'fill_category', column: 'City', value: ' Unknown ' }),
    ).toHaveProperty('value', ' Unknown '));
});
describe('display without losing zero values', () => {
  it('distinguishes zero, false and missing', () => {
    expect(formatCell(0)).toBe('0');
    expect(formatCell(false)).toBe('False');
    expect(formatCell(null)).toBe('Missing');
    expect(formatNumber(0)).toBe('0');
  });
  it('presents safe unknown failures', () =>
    expect(errorMessage(null)).toBe('The request could not be completed.'));
});
