import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

/**
 * Retorna o objeto de data de início e fim para um determinado mês e ano.
 * @param year O ano do período.
 * @param month O mês do período (0-11).
 * @returns Um objeto com startDate e endDate.
 */
export function getMonthPeriod(year: number, month: number) {
  const date = new Date(year, month);
  return {
    startDate: startOfMonth(date),
    endDate: endOfMonth(date),
  };
}

/**
 * Retorna o objeto de data de início e fim para um determinado ano.
 * @param year O ano do período.
 * @returns Um objeto com startDate e endDate.
 */
export function getYearPeriod(year: number) {
  const date = new Date(year, 0);
  return {
    startDate: startOfYear(date),
    endDate: endOfYear(date),
  };
}
