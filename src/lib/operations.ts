import { z } from 'zod';
import type { Operation, OperationKind } from './types';
export const operations: {
  kind: OperationKind;
  name: string;
  description: string;
  group: string;
}[] = [
  {
    kind: 'remove_duplicates',
    name: 'Remove duplicate rows',
    description: 'Keep the first occurrence of each complete row.',
    group: 'Rows',
  },
  {
    kind: 'drop_missing',
    name: 'Remove rows with missing values',
    description: 'Remove rows missing any value in your selected columns.',
    group: 'Rows',
  },
  {
    kind: 'fill_mean',
    name: 'Fill numeric values with mean',
    description: 'Replace missing numbers with the column average.',
    group: 'Missing values',
  },
  {
    kind: 'fill_median',
    name: 'Fill numeric values with median',
    description: 'Replace missing numbers with the middle observed value.',
    group: 'Missing values',
  },
  {
    kind: 'fill_category',
    name: 'Fill missing categorical values',
    description: 'Replace missing text with a value you choose.',
    group: 'Missing values',
  },
  {
    kind: 'rename_column',
    name: 'Rename a column',
    description: 'Give one column a clearer, unique name.',
    group: 'Columns',
  },
  {
    kind: 'drop_columns',
    name: 'Remove columns',
    description: 'Keep the fields you need. At least one must remain.',
    group: 'Columns',
  },
  {
    kind: 'normalize_names',
    name: 'Normalize column names',
    description: 'Create readable snake_case names and resolve collisions.',
    group: 'Columns',
  },
  {
    kind: 'convert_type',
    name: 'Convert a column type',
    description: 'Convert only when every observed value is compatible.',
    group: 'Text & types',
  },
  {
    kind: 'trim_whitespace',
    name: 'Trim whitespace',
    description: 'Remove leading and trailing spaces in text cells.',
    group: 'Text & types',
  },
];
export function validateOperation(op: Operation) {
  const text = z.string().trim().min(1).max(80);
  if (
    ['fill_mean', 'fill_median', 'fill_category', 'rename_column', 'convert_type'].includes(
      op.operation,
    )
  )
    text.parse(op.column);
  if (['fill_category', 'rename_column'].includes(op.operation))
    z.string()
      .trim()
      .min(1)
      .max(op.operation === 'rename_column' ? 80 : 200)
      .parse(op.value);
  if (op.operation === 'drop_columns' && !op.columns?.length)
    throw new Error('Choose at least one column to remove.');
  if (op.operation === 'convert_type' && !op.target) throw new Error('Choose a target data type.');
  return op;
}
export const operationName = (kind: string) =>
  operations.find((op) => op.kind === kind)?.name || kind;
export const formatNumber = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-GB', { maximumFractionDigits: 4 });
export const formatCell = (v: unknown) =>
  v == null ? 'Missing' : typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v);
export function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues.map((i) => i.message).join('. ');
  return error instanceof Error ? error.message : 'The request could not be completed.';
}
