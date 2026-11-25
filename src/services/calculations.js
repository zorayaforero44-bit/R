// Cálculos financieros, estimaciones responsables y trade-offs para RelieFin V3.1
// Diseñado para la realidad crediticia de Colombia (Superfinanciera / Tasas EA y MV)

export function formatCOP(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$ 0';
  const rounded = Math.round(amount);
  return '$ ' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === '') return 'Referencia no disponible';
  const cleanStr = String(value).replace(/%/g, '').replace(/E\.A\./gi, '').trim();
  const num = Number(cleanStr);
  if (isNaN(num)) return 'Referencia no disponible';
  return `${num.toFixed(1).replace('.', ',')} % E.A.`;
}

export function formatProductTypeName(type) {
  if (!type) return 'Obligación';
  const raw = String(type).trim();
  const lower = raw.toLowerCase();
  const map = {
    tarjeta_credito: 'Tarjeta de crédito',
    credito_consumo: 'Crédito de consumo',
    libre_inversion: 'Libre inversión',
    credito_fintech: 'Crédito fintech',
    libranza: 'Crédito de libranza',
    hipotecario: 'Crédito hipotecario',
    vehiculo: 'Crédito de vehículo',
    compra_cartera: 'Compra de cartera',
    otro: 'Otra obligación'
  };
  if (map[lower]) return map[lower];
  if (raw.includes('_')) {
    return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  return raw;
}

export function pluralizeDebts(count) {
  const n = Number(count) || 0;
  return n === 1 ? '1 deuda' : `${n} deudas`;
}

export function pluralizeObligations(count) {
  const n = Number(count) || 0;
  return n === 1 ? '1 obligación' : `${n} obligaciones`;
}

/**
 * Convierte Tasa Efectiva Anual (E.A.) a Mes Vencido (M.V.)
 * Fórmula exacta: MV = ((1 + EA/100)^(1/12) - 1) * 100
 */
export function convertEAToMV(rateEA) {
  if (rateEA === null || rateEA === undefined || isNaN(rateEA) || rateEA < 0) return null;
  if (Number(rateEA) === 0) return 0;
  const ea = Number(rateEA) / 100;
  const mv = (Math.pow(1 + ea, 1 / 12) - 1) * 100;
  return Number(mv.toFixed(4));
}

/**
 * Convierte Tasa Mes Vencido (M.V.) a Efectiva Anual (E.A.)
 * Fórmula exacta: EA = ((1 + MV/100)^12 - 1) * 100
 */
export function convertMVToEA(rateMV) {
  if (rateMV === null || rateMV === undefined || isNaN(rateMV) || rateMV < 0) return null;
  if (Number(rateMV) === 0) return 0;
  const mv = Number(rateMV) / 100;
  const ea = (Math.pow(1 + mv, 12) - 1) * 100;
  return Number(ea.toFixed(2));
}

/**
 * Calcula la cuota mensual fija de amortización (Sistema Francés estándar)
 *
 * Fórmula:
 * tasaMensual = (1 + tasaEA / 100)^(1/12) - 1
 * cuota = capital * tasaMensual / (1 - (1 + tasaMensual)^(-meses))
 * Si la tasa es cero: cuota = capital / meses
 */
export function calculateAmortizationMonthlyPayment(capital, rateEA, termMonths) {
  if (capital === null || capital === undefined || capital === '' ||
      rateEA === null || rateEA === undefined || rateEA === '' ||
      termMonths === null || termMonths === undefined || termMonths === '') {
    return null;
  }

  const cap = Number(capital);
  const term = Number(termMonths);
  const rate = Number(rateEA);

  if (isNaN(cap) || cap <= 0 || isNaN(term) || term <= 0) return null;
  if (isNaN(rate) || rate < 0) return null;

  if (rate === 0) {
    return Math.round(cap / term);
  }

  const monthlyRate = Math.pow(1 + (rate / 100), 1 / 12) - 1;
  const factor = 1 - Math.pow(1 + monthlyRate, -term);
  if (factor <= 0) return null;

  const cuota = (cap * monthlyRate) / factor;
  return Math.round(cuota);
}

/**
 * Calcula el desglose completo y coherente de un crédito o compra de cartera
 */
export function calculateCreditBreakdown(capital, rateEA, termMonths, actualMonthlyPayment = null) {
  if (capital === null || capital === undefined || capital === '' ||
      rateEA === null || rateEA === undefined || rateEA === '' ||
      termMonths === null || termMonths === undefined || termMonths === '') {
    return {
      isCalculable: false,
      reason: 'No es posible calcularlo con los datos disponibles (faltan saldo, tasa válida o plazo).'
    };
  }

  const cap = Number(capital);
  const term = Number(termMonths);
  const rate = Number(rateEA);

  if (isNaN(cap) || cap <= 0 || isNaN(term) || term <= 0 || isNaN(rate) || rate < 0) {
    return {
      isCalculable: false,
      reason: 'No es posible calcularlo con los datos disponibles (faltan saldo, tasa válida o plazo).'
    };
  }

  const monthlyPayment = calculateAmortizationMonthlyPayment(cap, rate, term);
  if (monthlyPayment === null) {
    return {
      isCalculable: false,
      reason: 'No es posible calcular la cuota con los parámetros proporcionados.'
    };
  }

  const totalCost = Math.round(monthlyPayment * term);
  const totalInterest = Math.max(0, totalCost - cap);
  const monthlyRate = convertEAToMV(rate);

  let isPaymentDiscrepant = false;
  let discrepancyAmount = 0;
  let discrepancyReason = null;

  if (actualMonthlyPayment !== null && actualMonthlyPayment !== undefined && !isNaN(actualMonthlyPayment) && actualMonthlyPayment > 0) {
    const act = Number(actualMonthlyPayment);
    discrepancyAmount = act - monthlyPayment;
    // Si la cuota declarada por el usuario difiere más de un 3% de la cuota matemática pura
    if (Math.abs(discrepancyAmount) > (monthlyPayment * 0.03)) {
      isPaymentDiscrepant = true;
      discrepancyReason = discrepancyAmount > 0
        ? `La cuota que pagas (${formatCOP(act)}) es superior a la amortización financiera pura (${formatCOP(monthlyPayment)}). La diferencia (${formatCOP(discrepancyAmount)}) suele obedecer a seguros obligatorios de vida/deudor, cargos de manejo o amortización acelerada.`
        : `La cuota que pagas (${formatCOP(act)}) es menor a la cuota nivelada calculada (${formatCOP(monthlyPayment)}), lo que podría corresponder a pagos mínimos o plazos no fijos.`;
    }
  }

  return {
    isCalculable: true,
    capital: cap,
    rateEA: rate,
    rateMV: monthlyRate,
    termMonths: term,
    monthlyPayment,
    actualMonthlyPayment: actualMonthlyPayment ? Number(actualMonthlyPayment) : null,
    totalCost,
    totalInterest,
    isPaymentDiscrepant,
    discrepancyAmount,
    discrepancyReason
  };
}

function compressTimelineSegments(monthlyTimeline = []) {
  if (!monthlyTimeline || monthlyTimeline.length === 0) return [];
  const segments = [];
  for (const entry of monthlyTimeline) {
    const last = segments[segments.length - 1];
    if (last && last.monthlyPayment === entry.totalPayment && last.activeCount === entry.activeCount) {
      last.toMonth = entry.month;
    } else {
      segments.push({
        fromMonth: entry.month,
        toMonth: entry.month,
        monthlyPayment: entry.totalPayment,
        activeCount: entry.activeCount
      });
    }
  }
  return segments;
}

/**
 * Proyecta una obligación individual mes a mes desde la misma fecha de corte (mes 1).
 * Cuenta cada cargo aplicable una sola vez.
 */
export function projectObligationSchedule(debt) {
  if (!debt || debt.isCancelled || debt.status === 'cancelada' || debt.status === 'cancelada_por_compra') {
    return {
      debtId: debt?.id || null,
      entity: debt?.entityName || debt?.entity || 'Entidad',
      isCancelled: true,
      isCalculable: true,
      balance: 0,
      initialMonthlyPayment: 0,
      lastPaymentMonth: 0,
      termMonths: 0,
      monthlyPayments: [],
      totalFuturePayments: 0,
      totalInterest: 0,
      totalCharges: 0,
      hasEstimatedData: false,
      estimationReasons: []
    };
  }

  const rawBal = (debt.balance !== null && debt.balance !== undefined && debt.balance !== '') ? Number(debt.balance) : null;
  const rawPay = (debt.monthlyPayment !== null && debt.monthlyPayment !== undefined && debt.monthlyPayment !== '') ? Number(debt.monthlyPayment) : null;
  const rawRate = (debt.rateEA !== null && debt.rateEA !== undefined && debt.rateEA !== '' && !isNaN(Number(debt.rateEA))) ? Number(debt.rateEA) : null;
  const rawTerm = (debt.termMonths !== null && debt.termMonths !== undefined && debt.termMonths !== '' && Number(debt.termMonths) > 0) ? Math.round(Number(debt.termMonths)) : null;

  const oneTimeCharges = Number(debt.oneTimeCharges ?? debt.cargosUnicos ?? 0) || 0;
  const separateMonthlyCharge = Number(debt.monthlyFees ?? debt.cargosMensuales ?? 0) || 0;

  let balance = (rawBal !== null && !isNaN(rawBal)) ? Math.max(0, rawBal) : null;
  if ((balance === null || balance === 0) && rawRate === 0 && rawPay > 0 && rawTerm > 0) {
    balance = rawPay * rawTerm;
  }
  if (!balance || balance <= 0) {
    return {
      debtId: debt.id || null,
      entity: debt.entityName || debt.entity || 'Entidad',
      isCancelled: false,
      isCalculable: true,
      balance: 0,
      initialMonthlyPayment: 0,
      lastPaymentMonth: 0,
      termMonths: 0,
      monthlyPayments: [],
      totalFuturePayments: 0,
      totalInterest: 0,
      totalCharges: 0,
      hasEstimatedData: false,
      estimationReasons: []
    };
  }

  const estimationReasons = [];
  const isRateEstimated = Boolean(
    debt.isEstimated ||
    debt.knowsRate === false ||
    (debt.rateSourceType && debt.rateSourceType !== 'user_reported')
  );
  if (isRateEstimated && rawRate !== null) {
    estimationReasons.push('Tasa estimada según referencia de mercado (no reportada desde extracto)');
  }

  if (rawRate === null || rawRate < 0) {
    return {
      debtId: debt.id || null,
      entity: debt.entityName || debt.entity || 'Entidad',
      isCancelled: false,
      isCalculable: false,
      hasMissingRate: true,
      reason: 'Falta la tasa de interés para proyectar esta obligación.',
      balance,
      initialMonthlyPayment: (rawPay && rawPay > 0 ? rawPay : 0) + separateMonthlyCharge,
      lastPaymentMonth: rawTerm || null,
      termMonths: rawTerm,
      monthlyPayments: [],
      totalFuturePayments: null,
      totalInterest: null,
      totalCharges: oneTimeCharges,
      hasEstimatedData: true,
      estimationReasons: ['Falta tasa de interés verificable para calcular intereses y costo futuro']
    };
  }

  const monthlyPayments = [];
  let termIsEstimated = false;
  let totalInterest = 0;

  if (rawRate === 0) {
    if (rawTerm > 0 && rawPay > 0) {
      if (Math.abs(rawPay * rawTerm - balance) <= Math.max(100, rawTerm * 5)) {
        let remaining = balance;
        for (let m = 1; m <= rawTerm; m++) {
          const basePay = m < rawTerm ? Math.min(remaining, rawPay) : remaining;
          remaining = Math.max(0, remaining - basePay);
          monthlyPayments.push(Math.round(basePay) + separateMonthlyCharge);
        }
      } else {
        let remaining = balance;
        let m = 0;
        while (remaining > 0.5 && m < 240) {
          m++;
          const basePay = Math.min(remaining, rawPay);
          remaining = Math.max(0, remaining - basePay);
          monthlyPayments.push(Math.round(basePay) + separateMonthlyCharge);
        }
        termIsEstimated = true;
        estimationReasons.push(`El plazo real con cuota de ${formatCOP(rawPay)} a 0 % E.A. es de ${m} meses (difiere del plazo ingresado)`);
      }
    } else if (rawTerm > 0) {
      const baseQuota = Math.round(balance / rawTerm);
      let remaining = balance;
      for (let m = 1; m <= rawTerm; m++) {
        const basePay = m < rawTerm ? Math.min(remaining, baseQuota) : remaining;
        remaining = Math.max(0, remaining - basePay);
        monthlyPayments.push(Math.round(basePay) + separateMonthlyCharge);
      }
      estimationReasons.push('Cuota mensual estimada dividiendo el saldo entre el plazo restante (tasa 0 %)');
    } else if (rawPay > 0) {
      let remaining = balance;
      let m = 0;
      while (remaining > 0.5 && m < 240) {
        m++;
        const basePay = Math.min(remaining, rawPay);
        remaining = Math.max(0, remaining - basePay);
        monthlyPayments.push(Math.round(basePay) + separateMonthlyCharge);
      }
      termIsEstimated = true;
      estimationReasons.push('Último mes con pagos estimado a partir del saldo y cuota porque no se ingresó el plazo');
    } else {
      return {
        debtId: debt.id || null,
        entity: debt.entityName || debt.entity || 'Entidad',
        isCancelled: false,
        isCalculable: false,
        balance,
        initialMonthlyPayment: separateMonthlyCharge,
        lastPaymentMonth: null,
        termMonths: null,
        monthlyPayments: [],
        totalFuturePayments: null,
        totalInterest: null,
        totalCharges: oneTimeCharges,
        hasEstimatedData: true,
        estimationReasons: ['Falta la cuota mensual y el plazo restante para proyectar los pagos']
      };
    }
  } else {
    // Tasa positiva (E.A. > 0)
    const monthlyRate = Math.pow(1 + (rawRate / 100), 1 / 12) - 1;
    if (rawTerm > 0 && rawPay > 0) {
      const pureQuota = calculateAmortizationMonthlyPayment(balance, rawRate, rawTerm);
      if (pureQuota && rawPay >= pureQuota * 0.97 && rawPay <= pureQuota * 1.15) {
        // La cuota declarada concuerda con la amortización del plazo ingresado (tolerancia de seguros/redondeo)
        for (let m = 1; m <= rawTerm; m++) {
          monthlyPayments.push(Math.round(rawPay) + separateMonthlyCharge);
        }
        if (Math.abs(rawPay - pureQuota) > pureQuota * 0.03) {
          estimationReasons.push('Cuota declarada incluye posible seguro o cargo fijo adicional a la amortización pura');
        }
      } else if (rawPay > balance * monthlyRate) {
        // Amortización mes a mes con la cuota declarada para determinar meses reales de liquidación
        let remaining = balance;
        let m = 0;
        while (remaining > 0.5 && m < 240) {
          m++;
          const interest = remaining * monthlyRate;
          const totalDue = remaining + interest;
          const basePay = Math.min(totalDue, rawPay);
          remaining = Math.max(0, totalDue - basePay);
          monthlyPayments.push(Math.round(basePay) + separateMonthlyCharge);
        }
        if (m !== rawTerm) {
          termIsEstimated = true;
          estimationReasons.push(
            rawPay > (pureQuota || 0)
              ? `Con tu cuota actual de ${formatCOP(rawPay)}, el saldo se liquidaría en ~${m} meses (menor al plazo ingresado de ${rawTerm} meses si no hay cargos ocultos)`
              : `Con tu cuota actual de ${formatCOP(rawPay)}, la amortización requeriría ~${m} meses (mayor al plazo ingresado de ${rawTerm} meses)`
          );
        }
      } else {
        // Cuota declarada no alcanza a cubrir intereses mensuales
        return {
          debtId: debt.id || null,
          entity: debt.entityName || debt.entity || 'Entidad',
          isCancelled: false,
          isCalculable: false,
          insufficientPayment: true,
          reason: 'La cuota declarada no cubre los intereses mensuales generados a esta tasa.',
          balance,
          initialMonthlyPayment: rawPay + separateMonthlyCharge,
          lastPaymentMonth: null,
          termMonths: rawTerm,
          monthlyPayments: [],
          totalFuturePayments: null,
          totalInterest: null,
          totalCharges: oneTimeCharges,
          hasEstimatedData: true,
          estimationReasons: ['La cuota declarada es inferior al interés mensual; no amortiza el capital']
        };
      }
    } else if (rawTerm > 0) {
      const pureQuota = calculateAmortizationMonthlyPayment(balance, rawRate, rawTerm);
      for (let m = 1; m <= rawTerm; m++) {
        monthlyPayments.push(pureQuota + separateMonthlyCharge);
      }
      estimationReasons.push('Cuota mensual estimada mediante amortización nivelada francesa');
    } else if (rawPay > 0) {
      if (rawPay <= balance * monthlyRate) {
        return {
          debtId: debt.id || null,
          entity: debt.entityName || debt.entity || 'Entidad',
          isCancelled: false,
          isCalculable: false,
          insufficientPayment: true,
          reason: 'La cuota declarada no cubre los intereses mensuales generados a esta tasa.',
          balance,
          initialMonthlyPayment: rawPay + separateMonthlyCharge,
          lastPaymentMonth: null,
          termMonths: null,
          monthlyPayments: [],
          totalFuturePayments: null,
          totalInterest: null,
          totalCharges: oneTimeCharges,
          hasEstimatedData: true,
          estimationReasons: ['La cuota declarada es inferior al interés mensual; no amortiza el capital']
        };
      }
      let remaining = balance;
      let m = 0;
      while (remaining > 0.5 && m < 240) {
        m++;
        const interest = remaining * monthlyRate;
        const totalDue = remaining + interest;
        const basePay = Math.min(totalDue, rawPay);
        remaining = Math.max(0, totalDue - basePay);
        monthlyPayments.push(Math.round(basePay) + separateMonthlyCharge);
      }
      termIsEstimated = true;
      estimationReasons.push('Plazo estimado por amortización porque no se ingresó el número de cuotas restantes');
    } else {
      return {
        debtId: debt.id || null,
        entity: debt.entityName || debt.entity || 'Entidad',
        isCancelled: false,
        isCalculable: false,
        balance,
        initialMonthlyPayment: separateMonthlyCharge,
        lastPaymentMonth: null,
        termMonths: null,
        monthlyPayments: [],
        totalFuturePayments: null,
        totalInterest: null,
        totalCharges: oneTimeCharges,
        hasEstimatedData: true,
        estimationReasons: ['Falta información de cuota y plazo']
      };
    }
  }

  const sumMonthlyPayments = monthlyPayments.reduce((s, p) => s + p, 0);
  const totalCharges = oneTimeCharges + (separateMonthlyCharge * monthlyPayments.length);
  // Cada cargo se suma una sola vez
  const totalFuturePayments = sumMonthlyPayments + oneTimeCharges;
  totalInterest = Math.max(0, totalFuturePayments - balance - totalCharges);

  return {
    debtId: debt.id || null,
    entity: debt.entityName || debt.entity || 'Entidad',
    isCancelled: false,
    isCalculable: true,
    balance,
    initialMonthlyPayment: monthlyPayments[0] || 0,
    lastPaymentMonth: monthlyPayments.length,
    termMonths: monthlyPayments.length,
    termIsEstimated,
    isRateEstimated,
    hasEstimatedData: isRateEstimated || termIsEstimated || estimationReasons.length > 0,
    estimationReasons,
    monthlyPayments,
    totalFuturePayments,
    totalInterest,
    totalCharges
  };
}

/**
 * Proyecta todas las obligaciones activas por separado y suma sus pagos mes a mes
 * desde la misma fecha de corte (mes 1).
 */
export function projectCurrentDebtsTimeline(debts = []) {
  const activeDebts = (debts || []).filter(
    d => d && !d.isCancelled && d.status !== 'cancelada' && d.status !== 'cancelada_por_compra'
  );

  if (activeDebts.length === 0) {
    return {
      schedules: [],
      isCostCalculable: false,
      costUncalculableReason: 'No hay obligaciones registradas para calcular el costo.',
      totalBalance: 0,
      initialJointPayment: 0,
      lastPaymentMonth: null,
      totalFuturePayments: null,
      totalInterest: null,
      totalCharges: 0,
      monthlyTimeline: [],
      timelineSegments: [],
      hasEstimatedData: false,
      estimationNotes: []
    };
  }

  const schedules = activeDebts.map(d => projectObligationSchedule(d));
  const totalBalance = schedules.reduce((s, sc) => s + (sc.balance || 0), 0);
  const initialJointPayment = schedules.reduce((s, sc) => s + (sc.initialMonthlyPayment || 0), 0);

  const uncalculable = schedules.filter(sc => !sc.isCalculable);
  const hasMissingRate = schedules.some(sc => sc.hasMissingRate);
  const estimationNotes = [];

  schedules.forEach(sc => {
    (sc.estimationReasons || []).forEach(reason => {
      estimationNotes.push({
        debtId: sc.debtId,
        entity: sc.entity,
        reason
      });
    });
  });

  if (uncalculable.length > 0) {
    const knownMonths = schedules.map(s => s.lastPaymentMonth || 0).filter(m => m > 0);
    const partialMaxMonth = knownMonths.length > 0 ? Math.max(...knownMonths) : null;
    return {
      schedules,
      isCostCalculable: false,
      costUncalculableReason: hasMissingRate
        ? 'No es posible calcularlo con los datos disponibles (falta conocer la tasa en una o más obligaciones).'
        : (uncalculable[0].reason || 'No es posible proyectar todas las obligaciones con los datos disponibles.'),
      totalBalance,
      initialJointPayment,
      lastPaymentMonth: partialMaxMonth,
      totalFuturePayments: null,
      totalInterest: null,
      totalCharges: schedules.reduce((s, sc) => s + (sc.totalCharges || 0), 0),
      monthlyTimeline: [],
      timelineSegments: [],
      hasEstimatedData: true,
      estimationNotes
    };
  }

  const lastPaymentMonth = Math.max(0, ...schedules.map(sc => sc.lastPaymentMonth || 0));
  const monthlyTimeline = [];

  for (let m = 1; m <= lastPaymentMonth; m++) {
    let monthTotal = 0;
    let activeCount = 0;
    const breakdown = [];
    for (const sc of schedules) {
      const pay = sc.monthlyPayments[m - 1] || 0;
      if (pay > 0) {
        monthTotal += pay;
        activeCount++;
        breakdown.push({ debtId: sc.debtId, entity: sc.entity, payment: pay });
      }
    }
    if (monthTotal > 0) {
      monthlyTimeline.push({
        month: m,
        totalPayment: monthTotal,
        activeCount,
        breakdown
      });
    }
  }

  const timelineSegments = compressTimelineSegments(monthlyTimeline);
  const totalCharges = schedules.reduce((s, sc) => s + (sc.totalCharges || 0), 0);
  const totalFuturePayments = schedules.reduce((s, sc) => s + (sc.totalFuturePayments || 0), 0);
  const totalInterest = Math.max(0, totalFuturePayments - totalBalance - totalCharges);
  const effectiveLastMonth = monthlyTimeline.length > 0 ? monthlyTimeline[monthlyTimeline.length - 1].month : 0;

  return {
    schedules,
    isCostCalculable: true,
    costUncalculableReason: null,
    totalBalance,
    initialJointPayment,
    lastPaymentMonth: effectiveLastMonth,
    totalFuturePayments,
    totalInterest,
    totalCharges,
    monthlyTimeline,
    timelineSegments,
    hasEstimatedData: schedules.some(sc => sc.hasEstimatedData),
    estimationNotes
  };
}

/**
 * Calcula el escenario completo de una compra de cartera (total o parcial),
 * combinando el nuevo crédito, sus cargos aplicables contados una sola vez,
 * las obligaciones que continúan sin cambios y los saldos remanentes de abonos parciales.
 */
export function calculateConsolidationScenarioSummary({
  newCredit = {},
  remainingDebts = [],
  partialDebts = []
} = {}) {
  const newPayment = (newCredit.monthlyPayment !== null && newCredit.monthlyPayment !== undefined && newCredit.monthlyPayment !== '')
    ? Number(newCredit.monthlyPayment)
    : null;
  const newTerm = (newCredit.termMonths !== null && newCredit.termMonths !== undefined && Number(newCredit.termMonths) > 0)
    ? Math.round(Number(newCredit.termMonths))
    : null;
  const oneTimeCharges = Number(newCredit.oneTimeCharges || 0) || 0;
  const extraMonthlyCharge = Number(newCredit.extraMonthlyCharge || 0) || 0;

  // Mapear deudas con abono parcial a su saldo remanente (conservando cuota declarada)
  const mappedPartialDebts = (partialDebts || []).map(p => {
    const baseDebt = p.debt || p;
    const remBal = p.remainingBalance !== undefined ? Number(p.remainingBalance) : Math.max(0, (Number(baseDebt.balance) || 0) - (Number(p.allocatedAmount) || 0));
    return {
      ...baseDebt,
      balance: remBal,
      // Si se conserva la cuota declarada, el abono parcial acorta el plazo cuando hay tasa conocida
      termMonths: null
    };
  }).filter(d => (Number(d.balance) || 0) > 0);

  const normalizedRemaining = (remainingDebts || []).map(r => r.debt || r);
  const continuingDebts = [...normalizedRemaining, ...mappedPartialDebts];
  const remainingSchedule = continuingDebts.length > 0
    ? projectCurrentDebtsTimeline(continuingDebts)
    : {
        schedules: [],
        isCostCalculable: true,
        totalBalance: 0,
        initialJointPayment: 0,
        lastPaymentMonth: 0,
        totalFuturePayments: 0,
        totalInterest: 0,
        totalCharges: 0,
        monthlyTimeline: [],
        timelineSegments: [],
        hasEstimatedData: false,
        estimationNotes: []
      };

  const remainingActiveMonthlyPayment = continuingDebts.reduce((s, d) => s + (Number(d.monthlyPayment) || 0), 0);
  const hasNewPayment = newPayment !== null && !isNaN(newPayment);
  const effectiveNewMonthly = hasNewPayment ? (newPayment + extraMonthlyCharge) : null;
  const initialJointMonthlyPayment = hasNewPayment ? (effectiveNewMonthly + remainingActiveMonthlyPayment) : null;

  const newCreditTotalPayments = (hasNewPayment && newTerm)
    ? Math.round((effectiveNewMonthly * newTerm) + oneTimeCharges)
    : null;

  const totalChargesCountedOnce = oneTimeCharges + (newTerm ? extraMonthlyCharge * newTerm : 0);

  const isScenarioCostCalculable = newCreditTotalPayments !== null && remainingSchedule.isCostCalculable;
  const scenarioTotalFuturePayment = isScenarioCostCalculable
    ? newCreditTotalPayments + (remainingSchedule.totalFuturePayments || 0)
    : null;

  const scenarioLastPaymentMonth = newTerm
    ? Math.max(newTerm, remainingSchedule.lastPaymentMonth || 0)
    : (remainingSchedule.lastPaymentMonth || null);

  // Construir línea de tiempo mes a mes unificada cuando hay cuota y plazo del nuevo crédito
  const monthlyTimeline = [];
  if (hasNewPayment && newTerm && remainingSchedule.isCostCalculable) {
    for (let m = 1; m <= scenarioLastPaymentMonth; m++) {
      const newCreditMonthPay = m <= newTerm ? effectiveNewMonthly : 0;
      const remEntry = remainingSchedule.monthlyTimeline.find(e => e.month === m);
      const remPay = remEntry ? remEntry.totalPayment : 0;
      const totalPayment = newCreditMonthPay + remPay;
      const activeCount = (newCreditMonthPay > 0 ? 1 : 0) + (remEntry ? remEntry.activeCount : 0);
      if (totalPayment > 0) {
        monthlyTimeline.push({ month: m, totalPayment, activeCount });
      }
    }
  }
  const timelineSegments = compressTimelineSegments(monthlyTimeline);

  return {
    isNewPaymentKnown: hasNewPayment,
    isScenarioCostCalculable,
    newCreditMonthlyPayment: effectiveNewMonthly,
    newCreditTotalPayments,
    oneTimeCharges,
    extraMonthlyCharge,
    totalChargesCountedOnce,
    remainingActiveMonthlyPayment,
    remainingDebtsBalance: remainingSchedule.totalBalance,
    remainingDebtsTotalFuturePayment: remainingSchedule.isCostCalculable ? remainingSchedule.totalFuturePayments : null,
    remainingDebtsLastMonth: remainingSchedule.lastPaymentMonth,
    remainingDebtsCostCalculable: remainingSchedule.isCostCalculable,
    remainingDebtsUncalculableReason: remainingSchedule.costUncalculableReason || null,
    initialJointMonthlyPayment,
    scenarioTotalFuturePayment,
    scenarioLastPaymentMonth,
    monthlyTimeline,
    timelineSegments,
    estimationNotes: remainingSchedule.estimationNotes
  };
}

/**
 * Calcula la radiografía financiera basada en las obligaciones del usuario
 * proyectando cada obligación por separado desde la misma fecha de corte.
 */
export function calculateSnapshot(debts = []) {
  if (!debts || debts.length === 0) {
    return {
      totalBalance: 0,
      totalMonthlyPayment: 0,
      initialJointPayment: 0,
      lastPaymentMonth: null,
      weightedRateEA: null,
      estimatedTermMonths: null,
      estimatedRemainingCost: null,
      estimatedTotalInterest: null,
      totalCharges: 0,
      pureAmortizationPayment: null,
      isCostCalculable: false,
      costUncalculableReason: 'No hay obligaciones registradas para calcular el costo.',
      hasUncertainty: false,
      hasMissingRates: false,
      totalCount: 0,
      knownRatesCount: 0,
      estimatedRatesCount: 0,
      noRateCount: 0,
      distribution: [],
      monthlyTimeline: [],
      timelineSegments: [],
      obligationSchedules: [],
      estimationNotes: []
    };
  }

  const timelineProjection = projectCurrentDebtsTimeline(debts);
  const totalBalance = timelineProjection.totalBalance || debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
  const totalMonthlyPayment = timelineProjection.initialJointPayment || debts.reduce((sum, d) => sum + (Number(d.monthlyPayment) || 0), 0);

  let weightedRateSum = 0;
  let balanceWithRate = 0;
  let knownRatesCount = 0;
  let estimatedRatesCount = 0;
  let noRateCount = 0;

  debts.forEach(d => {
    const bal = (d.balance !== null && d.balance !== undefined && d.balance !== '')
      ? (Number(d.balance) || 0)
      : ((Number(d.rateEA) === 0 && d.monthlyPayment && d.termMonths) ? (Number(d.monthlyPayment) * Number(d.termMonths)) : 0);
    const rate = d.rateEA !== null && d.rateEA !== undefined && d.rateEA !== '' && !isNaN(Number(d.rateEA))
      ? Number(d.rateEA)
      : null;
    const isUserReported = d.rateSourceType === 'user_reported' ||
      (d.knowsRate && rate !== null && rate >= 0 && !d.isEstimated);

    if (rate !== null && rate >= 0) {
      weightedRateSum += bal * rate;
      balanceWithRate += bal;
      if (isUserReported) {
        knownRatesCount++;
      } else {
        estimatedRatesCount++;
      }
    } else {
      noRateCount++;
    }
  });

  const hasMissingRates = noRateCount > 0;
  const hasUncertainty = estimatedRatesCount > 0 || hasMissingRates || timelineProjection.hasEstimatedData;
  const weightedRateEA = balanceWithRate > 0 ? Number((weightedRateSum / balanceWithRate).toFixed(1)) : null;

  const estimatedTermMonths = timelineProjection.lastPaymentMonth;
  const isCostCalculable = timelineProjection.isCostCalculable;
  const estimatedRemainingCost = isCostCalculable ? timelineProjection.totalFuturePayments : null;
  const estimatedTotalInterest = isCostCalculable ? timelineProjection.totalInterest : null;
  const costUncalculableReason = timelineProjection.costUncalculableReason;

  // Cuota nivelada de referencia por suma individual de amortizaciones puras (para detectar seguros/cargos)
  let pureAmortizationPayment = null;
  if (isCostCalculable) {
    const individualPureSum = debts.reduce((sum, d) => {
      const bal = Number(d.balance) || 0;
      const rate = (d.rateEA !== null && d.rateEA !== undefined && !isNaN(Number(d.rateEA))) ? Number(d.rateEA) : null;
      const term = (d.termMonths && Number(d.termMonths) > 0) ? Number(d.termMonths) : null;
      if (bal > 0 && rate !== null && term) {
        return sum + (calculateAmortizationMonthlyPayment(bal, rate, term) || 0);
      }
      return sum;
    }, 0);
    if (individualPureSum > 0) {
      pureAmortizationPayment = individualPureSum;
    } else if (weightedRateEA !== null && estimatedTermMonths > 0 && totalBalance > 0) {
      pureAmortizationPayment = calculateAmortizationMonthlyPayment(totalBalance, weightedRateEA, estimatedTermMonths);
    }
  }

  const distribution = debts.map(d => {
    const entityTitle = d.entityName || d.entity || 'Entidad';
    const productTitle = formatProductTypeName(d.productType || d.type || 'Obligación');
    const bal = (d.balance !== null && d.balance !== undefined && d.balance !== '')
      ? (Number(d.balance) || 0)
      : ((Number(d.rateEA) === 0 && d.monthlyPayment && d.termMonths) ? (Number(d.monthlyPayment) * Number(d.termMonths)) : 0);
    const schedule = timelineProjection.schedules.find(s => s.debtId === d.id) || null;
    return {
      id: d.id,
      type: productTitle,
      entity: entityTitle,
      balance: bal,
      monthlyPayment: Number(d.monthlyPayment) || 0,
      termMonths: d.termMonths || schedule?.lastPaymentMonth || null,
      percentage: totalBalance > 0 ? Math.round((bal / totalBalance) * 100) : 0,
      rateEA: d.rateEA,
      rateSourceType: d.rateSourceType || (d.knowsRate ? 'user_reported' : 'colombia_general_reference'),
      rateConfidence: d.rateConfidence || (d.knowsRate ? 'alta' : 'baja'),
      isEstimated: Boolean(d.isEstimated || (d.knowsRate === false)),
      isUserProvided: Boolean(d.knowsRate && (d.rateSourceType === 'user_reported' || !d.isEstimated)),
      rateSourceUrl: d.rateSourceUrl || null,
      rateSourceDate: d.rateSourceDate || null,
      referenceRateMin: d.referenceRateMin || null,
      referenceRateMax: d.referenceRateMax || null,
      schedule
    };
  });

  return {
    totalBalance,
    totalMonthlyPayment,
    initialJointPayment: totalMonthlyPayment,
    lastPaymentMonth: estimatedTermMonths,
    weightedRateEA,
    estimatedTermMonths,
    estimatedRemainingCost,
    estimatedTotalInterest,
    totalCharges: timelineProjection.totalCharges,
    pureAmortizationPayment,
    isCostCalculable,
    costUncalculableReason,
    hasUncertainty,
    hasMissingRates,
    totalCount: debts.length,
    knownRatesCount,
    estimatedRatesCount,
    noRateCount,
    distribution,
    monthlyTimeline: timelineProjection.monthlyTimeline,
    timelineSegments: timelineProjection.timelineSegments,
    obligationSchedules: timelineProjection.schedules,
    estimationNotes: timelineProjection.estimationNotes
  };
}

/**
 * Evalúa los trade-offs distinguiendo claramente:
 * 1. Cuota mensual conjunta (nuevo crédito + obligaciones que continúan)
 * 2. Último mes con pagos
 * 3. Total futuro a pagar (pagos futuros + cargos contados una sola vez)
 * Muestra ambas diferencias en pesos cuando baja la cuota mensual y aumenta el total futuro.
 */
export function calculateTradeOff(snapshot, alternative) {
  const altMonthly = alternative.pagoMensualTotalPosterior ?? alternative.simulation?.pagoMensualTotalPosterior ?? alternative.cuotaMensual ?? null;
  const altTerm = alternative.scenarioLastPaymentMonth ?? alternative.simulation?.scenarioLastPaymentMonth ?? alternative.plazoMeses ?? null;
  const altCost = alternative.scenarioTotalFuturePayment ?? alternative.simulation?.scenarioTotalFuturePayment ?? alternative.costoTotalEstimado ?? null;

  const baseMonthly = snapshot.initialJointPayment ?? snapshot.totalMonthlyPayment ?? null;
  const baseTerm = snapshot.lastPaymentMonth ?? snapshot.estimatedTermMonths ?? null;
  const baseCost = snapshot.estimatedRemainingCost ?? null;

  const hasCuota = altMonthly !== null && altMonthly !== undefined && baseMonthly !== null && baseMonthly !== undefined;
  const cuotaDiff = hasCuota ? (altMonthly - baseMonthly) : null;

  const hasTermComparison = baseTerm !== null && baseTerm !== undefined && altTerm !== null && altTerm !== undefined;
  const plazoDiff = hasTermComparison ? (altTerm - baseTerm) : null;

  const hasCostComparison = baseCost !== null && baseCost !== undefined && altCost !== null && altCost !== undefined;
  const costoDiff = hasCostComparison ? (altCost - baseCost) : null;

  const monthlyPaymentDropsAndTotalIncreases = Boolean(
    hasCuota && cuotaDiff < 0 && hasCostComparison && costoDiff > 0
  );

  const whatYouGain = [];
  const whatYouSacrifice = [];
  const whatYouShouldReview = [];

  // 1. Análisis de Cuota Mensual Conjunta
  if (hasCuota) {
    if (cuotaDiff < 0) {
      whatYouGain.push(`Reducción de cuota mensual de ${formatCOP(Math.abs(cuotaDiff))} al mes (bajaría de ${formatCOP(baseMonthly)} a ${formatCOP(altMonthly)}).`);
    } else if (cuotaDiff > 0) {
      whatYouSacrifice.push(`Tu pago mensual conjunto aumentaría en ${formatCOP(cuotaDiff)} al mes.`);
    } else {
      whatYouGain.push(`Tu pago mensual conjunto se mantiene igual (${formatCOP(altMonthly)}).`);
    }
  } else {
    whatYouShouldReview.push('Cuota mensual pendiente por definir: se requiere confirmar tasa/cuota con la entidad.');
  }

  // 2. Análisis de Último Mes con Pagos (Plazo)
  if (hasTermComparison) {
    if (plazoDiff < 0) {
      whatYouGain.push(`Reducción de plazo: terminarías de pagar en el mes ${altTerm} (${Math.abs(plazoDiff)} meses antes que en el mes ${baseTerm}).`);
    } else if (plazoDiff > 0) {
      whatYouSacrifice.push(`Extensión de plazo: terminarías de pagar en el mes ${altTerm} (${plazoDiff} meses después que hoy, mes ${baseTerm}).`);
    } else {
      whatYouGain.push(`Mantienes el mismo mes de último pago (${altTerm} meses).`);
    }
  }

  // 3. Análisis de Total Futuro a Pagar (en pesos)
  if (hasCostComparison) {
    if (costoDiff < 0) {
      whatYouGain.push(`Pagarías ${formatCOP(Math.abs(costoDiff))} menos en total futuro (de ${formatCOP(baseCost)} a ${formatCOP(altCost)}).`);
    } else if (costoDiff > 0) {
      whatYouSacrifice.push(`El total futuro a pagar aumentaría en ${formatCOP(costoDiff)} (pasaría de ${formatCOP(baseCost)} a ${formatCOP(altCost)}).`);
    }
  } else {
    whatYouShouldReview.push('No es posible calcular la diferencia en el total futuro porque faltan tasas o datos de alguna obligación.');
  }

  // Advertencia explícita cuando baja la cuota mensual pero sube el total futuro
  if (monthlyPaymentDropsAndTotalIncreases) {
    whatYouShouldReview.push(
      `⚖️ Compensación clave: Tu pago mensual bajaría ${formatCOP(Math.abs(cuotaDiff))}/mes, pero terminarías pagando ${formatCOP(costoDiff)} más en total futuro por el mayor plazo o tasa.`
    );
  }

  if (snapshot.hasUncertainty) {
    whatYouShouldReview.push('⚠️ Advertencia: Al menos una obligación usa tasas o plazos estimados. Las cifras indicadas son proyecciones orientativas.');
  }
  whatYouShouldReview.push('Una compra de cartera no garantiza ahorro total por sí sola; depende de la tasa definitiva, plazo y cargos únicos o seguros.');

  return {
    cuotaDiff,
    plazoDiff,
    costoDiff,
    hasCuotaComparison: hasCuota,
    hasTermComparison,
    hasCostComparison,
    monthlyPaymentDropsAndTotalIncreases,
    hasUncertainty: snapshot.hasUncertainty,
    whatYouGain,
    whatYouSacrifice,
    whatYouShouldReview
  };
}

/**
 * Simulación de pagos adicionales demostrativos (Método nivelado de amortización)
 */
export function simulateAdditionalPayment(balance, monthlyPayment, rateEA, extraMonthly) {
  if (!balance || balance <= 0 || !monthlyPayment || monthlyPayment <= 0) {
    return { monthsSaved: 0, interestSaved: 0, newTerm: 0, baseMonths: 0, newMonths: 0 };
  }

  const r = Math.pow(1 + ((rateEA || 25) / 100), 1 / 12) - 1;
  const currentPay = Number(monthlyPayment);
  const extra = Number(extraMonthly) || 0;
  const totalPay = currentPay + extra;

  function calcMonths(payment) {
    if (balance * r >= payment) return 60;
    const n = -Math.log(1 - (balance * r) / payment) / Math.log(1 + r);
    return Math.max(1, Math.min(120, Math.round(n)));
  }

  const baseMonths = calcMonths(currentPay);
  const newMonths = calcMonths(totalPay);
  const monthsSaved = Math.max(0, baseMonths - newMonths);

  const baseTotalCost = baseMonths * currentPay;
  const newTotalCost = newMonths * totalPay;
  const interestSaved = Math.max(0, baseTotalCost - newTotalCost);

  return {
    baseMonths,
    newMonths,
    monthsSaved,
    interestSaved: Math.round(interestSaved)
  };
}

/**
 * Calendario de vencimientos
 */
export function generatePaymentCalendar(debts = []) {
  return debts.map((d, index) => {
    const day = d.paymentDay ? Number(d.paymentDay) : ((index * 7 + 5) % 28 || 15);
    const entityTitle = d.entityName || d.entity || 'Entidad';
    const productTitle = d.productType || d.type || 'Obligación';
    return {
      debtId: d.id,
      entity: entityTitle,
      type: productTitle,
      monthlyPayment: Number(d.monthlyPayment) || 0,
      paymentDay: day,
      formattedDay: `Día ${day} de cada mes`
    };
  }).sort((a, b) => a.paymentDay - b.paymentDay);
}

/**
 * Escenarios orientativos de priorización (Bola de Nieve, Avalancha, Flujo)
 */
export function generatePrioritizationScenarios(debts = [], extraMonthly = 100000) {
  if (!debts || debts.length === 0) return [];

  const snowball = [...debts].sort((a, b) => (Number(a.balance) || 0) - (Number(b.balance) || 0));
  const avalanche = [...debts].sort((a, b) => (Number(b.rateEA || 0)) - (Number(a.rateEA || 0)));
  const cashflow = [...debts].sort((a, b) => (Number(b.monthlyPayment) || 0) - (Number(a.monthlyPayment) || 0));

  const getEntityTitle = (d) => d?.entityName || d?.entity || 'Entidad';

  return [
    {
      id: 'snowball',
      name: 'Método Bola de Nieve (Menor saldo primero)',
      tagline: 'Ideal para motivación y victorias rápidas',
      description: 'Priorizas pagar la deuda con menor saldo restante destinando el pago adicional a ella mientras pagas el mínimo en las demás.',
      firstFocus: getEntityTitle(snowball[0]),
      firstBalance: snowball[0]?.balance || 0,
      order: snowball.map(d => `${getEntityTitle(d)} (${formatCOP(d.balance)})`),
      tradeOff: 'Te brinda satisfacción psicológica rápida al eliminar obligaciones por completo, aunque pagues algo más de interés total que en avalancha.'
    },
    {
      id: 'avalanche',
      name: 'Método Avalancha (Mayor tasa primero)',
      tagline: 'Ideal para minimizar el costo financiero',
      description: 'Priorizas la obligación con la tasa de interés más alta. Es la estrategia matemáticamente más eficiente.',
      firstFocus: getEntityTitle(avalanche[0]),
      firstRate: avalanche[0]?.rateEA || 0,
      order: avalanche.map(d => `${getEntityTitle(d)} (${formatPercent(d.rateEA)})`),
      tradeOff: 'Ahorras la mayor cantidad posible de intereses en el tiempo, pero puede tardar más meses en verse la primera deuda completamente saldada.'
    },
    {
      id: 'cashflow',
      name: 'Método Flujo de Caja (Mayor cuota primero)',
      tagline: 'Ideal para liberar presupuesto mensual rápido',
      description: 'Te enfocas en liquidar primero la obligación que exige la cuota mensual más pesada, liberando liquidez de tu sueldo mes a mes.',
      firstFocus: getEntityTitle(cashflow[0]),
      firstPayment: cashflow[0]?.monthlyPayment || 0,
      order: cashflow.map(d => `${getEntityTitle(d)} (${formatCOP(d.monthlyPayment)}/mes)`),
      tradeOff: 'Alivia rápidamente la presión en tus gastos del mes, aumentando tu margen de maniobra ante imprevistos.'
    }
  ];
}
