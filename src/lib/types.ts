export type DataType = 'integer' | 'decimal' | 'text' | 'boolean' | 'date';
export type Cell = string | number | boolean | null;
export interface ColumnProfile {
  name: string;
  type: DataType;
  missing: number;
  unique: number;
  topValues: { value: Cell; count: number }[];
  stats: {
    count: number;
    min: number | null;
    max: number | null;
    mean: number | null;
    median: number | null;
    std: number | null;
  } | null;
}
export interface Profile {
  rows: number;
  columns: number;
  missingCells: number;
  rowsWithMissing: number;
  duplicateRows: number;
  completeness: number;
  memoryBytes: number;
  columnProfiles: ColumnProfile[];
}
export interface Preview {
  columns: string[];
  rows: Cell[][];
  offset: number;
  limit: number;
  totalRows: number;
}
export interface DatasetSummary {
  id: string;
  name: string;
  source: {
    format: 'CSV' | 'XLSX';
    sheet: string | null;
    sheets: string[];
    sample: boolean;
    delimiter: string | null;
  };
  rows: number;
  columns: number;
  revision: number;
  createdAt: string;
  steps: number;
}
export interface HistoryItem {
  kind: OperationKind;
  description: string;
  createdAt: string;
  before: { rows: number; columns: number; missingCells: number };
  after: { rows: number; columns: number; missingCells: number };
}
export interface Dataset extends DatasetSummary {
  profile: Profile;
  originalProfile: Profile;
  currentPreview: Preview;
  originalPreview: Preview;
  history: HistoryItem[];
}
export type OperationKind =
  | 'remove_duplicates'
  | 'drop_missing'
  | 'fill_mean'
  | 'fill_median'
  | 'fill_category'
  | 'rename_column'
  | 'drop_columns'
  | 'convert_type'
  | 'trim_whitespace'
  | 'normalize_names';
export interface Operation {
  operation: OperationKind;
  column?: string;
  columns?: string[];
  value?: string;
  target?: DataType;
}
export interface TransformPreview {
  description: string;
  before: Profile;
  after: Profile;
  preview: Preview;
  revision: number;
}
export interface Sample {
  id: string;
  name: string;
  description: string;
  filename: string;
  format: string;
  rows: number;
  columns: number;
  category: string;
  sheet: string | null;
}
export interface Session {
  expiresAt: string;
  limits: {
    uploadBytes: number;
    rows: number;
    columns: number;
    cells: number;
    datasets: number;
    transformations: number;
  };
}
export interface ChartData {
  kind: 'histogram' | 'bar' | 'line' | 'scatter';
  xColumn: string;
  yColumn: string | null;
  data: { x: string | number; y: number }[];
  includedRows: number;
  missingRows: number;
  totalRows: number;
  limited: boolean;
}
export interface DuplicateReview {
  column: string;
  candidates: {
    left: string;
    right: string;
    leftCount: number;
    rightCount: number;
    reason: string;
    similarity: number;
  }[];
  reviewedValues: number;
  totalUnique: number;
  limited: boolean;
}
