/** Column descriptor for the generic DataTable component. */
export interface Column<Row> {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  /** Optional formatter for plain-text cells (ignored if a slot is provided). */
  format?: (row: Row) => string
}
