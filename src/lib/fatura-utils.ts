import {
  startOfMonth,
  endOfMonth,
  set,
  addMonths,
  subMonths,
  isAfter,
  isBefore,
  isEqual,
} from 'date-fns';
import { text } from './strings';

/**
 * Calcula o período de uma fatura com base no ano, mês e dia de fechamento do cartão.
 * A fatura "de Julho" geralmente inclui compras feitas do dia de fechamento de Junho
 * até o dia de fechamento de Julho.
 *
 * @param year Ano da fatura (ex: 2024)
 * @param month Mês da fatura (0-11, ex: 6 para Julho)
 * @param closingDay Dia de fechamento do cartão (1-31)
 * @param dueDay Dia de vencimento do cartão (1-31)
 * @returns Um objeto com as datas de início e fim da fatura, e as datas de fechamento e vencimento.
 */
export function getFaturaPeriod(
  year: number,
  month: number,
  closingDay: number,
  dueDay: number
) {
  // A data de fechamento da fatura do mês selecionado.
  const closingDate = set(new Date(), {
    year,
    month,
    date: closingDay,
    hours: 23,
    minutes: 59,
    seconds: 59,
  });

  // A data de fechamento é o fim do período de compras.
  const endDate = closingDate;

  // A data de início das compras é no mês anterior ao fechamento.
  const startDate = set(subMonths(closingDate, 1), { date: closingDay + 1, hours: 0, minutes: 0, seconds: 0 });

  // A data de vencimento é no mesmo mês da fatura ou no mês seguinte.
  let dueDate: Date;
  if (dueDay > closingDay) {
    // Vencimento no mesmo mês do fechamento
    dueDate = set(closingDate, { date: dueDay });
  } else {
    // Vencimento no mês seguinte ao fechamento
    dueDate = set(addMonths(closingDate, 1), { date: dueDay });
  }

  return { startDate, endDate, closingDate, dueDate };
}

/**
 * Determina o status de uma fatura.
 * @param totalFatura O valor total das compras na fatura.
 * @param totalPago O valor total pago para essa fatura.
 * @param vencimento A data de vencimento da fatura.
 * @returns O status da fatura como uma string.
 */
export function getFaturaStatus(
  totalFatura: number,
  totalPago: number,
  vencimento: Date
) {
  const hoje = new Date();
  const valorRestante = totalFatura - totalPago;
  const BRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (totalPago >= totalFatura) {
    if (totalPago > totalFatura) {
      return {
        status: text.payBillForm.creditStatus(BRL(totalPago - totalFatura)),
        color: 'text-green-500',
      };
    }
    return { status: text.payBillForm.billPaid, color: 'text-green-500' };
  }

  // Fatura ainda não foi paga integralmente
  if (isBefore(hoje, vencimento) || isEqual(hoje, vencimento)) {
    // Fatura está em aberto e dentro do prazo
    if (totalPago > 0) {
      return {
        status: text.payBillForm.billToPay(BRL(valorRestante)),
        color: 'text-blue-500',
      };
    }
    return { status: 'Fatura em aberto', color: 'text-blue-500' };
  }

  // Fatura está vencida
  return { status: text.payBillForm.billOverdue, color: 'text-red-500' };
}
