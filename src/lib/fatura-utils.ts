import {
  set,
  addMonths,
  subMonths,
  isAfter,
  isBefore,
  isEqual,
  getDate,
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
  // Ex: Para a fatura de "Outubro", o fechamento é em 05/10.
  const closingDate = set(new Date(), {
    year,
    month,
    date: closingDay,
    hours: 23,
    minutes: 59,
    seconds: 59,
    milliseconds: 999
  });

  // O período de compras termina na data de fechamento.
  const endDate = closingDate;

  // O período de compras começa no dia seguinte ao fechamento do mês anterior.
  // Ex: Fatura de Outubro (fecha 05/10), começa a contar em 06/09.
  const startDate = set(subMonths(closingDate, 1), { date: closingDay + 1, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });

  // A data de vencimento é baseada no dia de vencimento configurado.
  // Se o dia de vencimento for menor que o de fechamento (ex: fecha 5, vence 1),
  // o vencimento ocorre no mês seguinte ao fechamento.
  let dueDate: Date;
  if (dueDay < closingDay) {
    // Vencimento no mês seguinte ao fechamento.
    // Ex: Fatura de Outubro (fecha 05/10), vence em 01/11.
    dueDate = set(addMonths(closingDate, 1), { date: dueDay });
  } else {
    // Vencimento no mesmo mês do fechamento.
    // Ex: Fatura de Outubro (fecha 05/10), vence em 12/10.
    dueDate = set(closingDate, { date: dueDay });
  }
   dueDate = set(dueDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });

  return { startDate, endDate, closingDate, dueDate };
}


/**
 * Determina o mês e ano da fatura "atual" (em aberto) com base na data de hoje
 * e no dia de fechamento do cartão.
 * @param today A data de hoje.
 * @param closingDay O dia de fechamento do cartão.
 * @returns Um objeto com o mês (month) e ano (year) da fatura atual.
 */
export function getCurrentFaturaMonthAndYear(today: Date, closingDay: number) {
  const dayOfMonth = getDate(today);

  // Se o dia de hoje for posterior ao dia de fechamento, a fatura em aberto é a do próximo mês.
  // Ex: Hoje é 29/10, fechamento dia 5. A fatura de Outubro já fechou. A atual é a de Novembro.
  if (dayOfMonth > closingDay) {
    const nextMonth = addMonths(today, 1);
    return {
      month: nextMonth.getMonth(),
      year: nextMonth.getFullYear()
    };
  }
  
  // Se o dia de hoje for igual ou anterior ao dia de fechamento, a fatura em aberto é a do mês corrente.
  // Ex: Hoje é 04/10, fechamento dia 5. A fatura atual ainda é a de Outubro.
  return {
    month: today.getMonth(),
    year: today.getFullYear()
  };
}


/**
 * Determina o status de uma fatura.
 * @param totalFatura O valor total das compras na fatura.
 * @param totalPago O valor total pago para essa fatura.
 * @param vencimento A data de vencimento da fatura.
 * @param fechamento A data de fechamento da fatura.
 * @param isCurrentFatura Se esta é a fatura atualmente aberta para compras.
 * @param isFutureFatura Se esta é uma fatura de um mês futuro.
 * @returns O status da fatura como uma string.
 */
export function getFaturaStatus(
  totalFatura: number,
  totalPago: number,
  vencimento: Date,
  fechamento: Date,
  isCurrentFatura: boolean,
  isFutureFatura: boolean,
) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const valorRestante = totalFatura - totalPago;
  const BRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 1. Fatura Paga (total ou parcial com crédito)
  if (totalFatura > 0 && totalPago >= totalFatura) {
    if (totalPago > totalFatura) {
      return {
        status: text.payBillForm.creditStatus(BRL(totalPago - totalFatura)),
        color: 'text-green-500',
      };
    }
    return { status: text.payBillForm.billPaid, color: 'text-green-500' };
  }

  // 2. Fatura Vencida
  if (isAfter(hoje, vencimento) && valorRestante > 0) {
    return { status: text.payBillForm.billOverdue, color: 'text-red-500' };
  }
  
  // 3. Fatura Fechada (após o fechamento e antes do vencimento)
  if (isAfter(hoje, fechamento) && (isBefore(hoje, vencimento) || isEqual(hoje, vencimento))) {
     if (valorRestante > 0) {
       return { status: text.payBillForm.closedBillToPay(BRL(valorRestante)), color: 'text-orange-500' };
     }
     return { status: text.payBillForm.billClosed, color: 'text-orange-500' };
  }
  
  // 4. Fatura Atual
  if (isCurrentFatura) {
      return { status: text.payBillForm.currentBill, color: 'text-blue-500' };
  }

  // 5. Fatura Futura
  if(isFutureFatura) {
      return { status: text.payBillForm.futureBill, color: 'text-purple-500' };
  }

  // 6. Fatura em Aberto (padrão para faturas passadas que não se encaixam nos outros critérios)
  if (totalPago > 0) {
    return {
      status: text.payBillForm.billToPay(BRL(valorRestante)),
      color: 'text-blue-500',
    };
  }
  
  // 7. Sem lançamentos
  if (totalFatura === 0) {
    return { status: "Sem lançamentos", color: 'text-muted-foreground' };
  }
  
  return { status: 'Fatura em aberto', color: 'text-blue-500' };
}
