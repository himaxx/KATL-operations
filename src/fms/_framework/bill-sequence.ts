/**
 * Bill Sequence Gap Detection Helper
 * Detects missing bill / challan numbers in numerical sequences.
 */

export interface BillEntry {
  billNumber: string | number;
  flowId: string;
  createdAt: Date;
}

export function detectBillSequenceGaps(entries: BillEntry[]): number[] {
  const numericBills = entries
    .map((e) => {
      const num = typeof e.billNumber === 'number' ? e.billNumber : parseInt(String(e.billNumber).replace(/\D/g, ''), 10);
      return isNaN(num) ? null : num;
    })
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  if (numericBills.length <= 1) return [];

  const min = numericBills[0];
  const max = numericBills[numericBills.length - 1];
  const presentSet = new Set(numericBills);
  const missing: number[] = [];

  for (let i = min + 1; i < max; i++) {
    if (!presentSet.has(i)) {
      missing.push(i);
    }
  }

  return missing;
}
