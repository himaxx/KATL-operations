/**
 * Display Number Generation for FMS Flows
 * Format: <CODE>-<FY>-<SERIAL> (e.g. O2D-2627-0001)
 * Financial Year: 1 April -> 31 March
 */

import { getISTComponents } from '../../core/working-time/engine';

export function getIndianFinancialYearCode(date: Date = new Date()): string {
  const ist = getISTComponents(date);
  // In IST, month 0 = Jan, 3 = April
  let startYear = ist.year;
  let endYear = ist.year + 1;

  if (ist.month < 3) {
    // Jan, Feb, Mar belong to previous calendar year's FY
    startYear = ist.year - 1;
    endYear = ist.year;
  }

  const startYY = String(startYear).slice(-2);
  const endYY = String(endYear).slice(-2);
  return `${startYY}${endYY}`;
}

export function formatFmsDisplayNumber(code: string, serial: number, date: Date = new Date()): string {
  if (code === 'PUR') {
    return `PO-${1000 + serial}`;
  }
  if (code === 'O2D') {
    return `O2D-${1000 + serial}`;
  }
  const fy = getIndianFinancialYearCode(date);
  const serialPadded = String(serial).padStart(4, '0');
  return `${code}-${fy}-${serialPadded}`;
}
