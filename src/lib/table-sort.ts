/**
 * Natural sort for table numbers like T1, T2, T10 (not T1, T10, T2).
 */
export function compareTableNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function sortByTableNumber<T extends { tableNumber: string }>(
  tables: T[],
): T[] {
  return [...tables].sort((left, right) =>
    compareTableNumbers(left.tableNumber, right.tableNumber),
  );
}
