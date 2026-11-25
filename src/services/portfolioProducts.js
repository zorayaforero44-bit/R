// Catálogo oficial de productos reales de compra de cartera en Colombia (RelieFin V3.2)
// Fuentes oficiales verificables: Tarifarios de banca de personas y portales públicos de bancos colombianos.

import { 
  calculateAmortizationMonthlyPayment, 
  calculateConsolidationScenarioSummary,
  convertEAToMV, 
  convertMVToEA, 
  formatCOP, 
  formatPercent,
  pluralizeDebts,
  pluralizeObligations
} from './calculations.js';

export const REAL_PORTFOLIO_PRODUCTS = [
  {
    id: 'bancolombia_compra_cartera',
    entityId: 'bancolombia',
    entityName: 'Bancolombia',
    commercialName: 'Compra de Cartera Consumo',
    officialUrl: 'https://www.bancolombia.com/personas/productos/compra-cartera',
    officialSource: 'Tarifario oficial Bancolombia · Portal Personas',
    effectiveDate: 'Referencia histórica 2024 · Pendiente de actualización 2026',
    isHistoricalTariff: true,
    rateType: 'range', // 'range' | 'from' | 'custom'
    rateMinMV: 1.30,
    rateMaxMV: 2.12,
    rateMinEA: 16.77,
    rateMaxEA: 28.57,
    rateDisplayMV: 'Tasa entre 1,30 % y 2,12 % M.V.',
    rateDisplayEA: '16,77 % a 28,57 % E.A.',
    minTerm: 12,
    maxTerm: 72,
    minAmount: 1000000,
    maxAmount: null,
    eligibleObligationTypes: ['tarjeta_credito', 'libre_inversion', 'credito_consumo', 'credito_fintech'],
    canBuyOwnDebt: false,
    knownRestrictions: [
      'No compra deudas propias emitidas por Bancolombia (tarjetas o créditos vigentes en el banco).',
      'Aplica para obligaciones al día (sin mora) en otras entidades vigiladas por la Superfinanciera.',
      'Plazo de 12 a 72 meses según capacidad de pago y políticas de riesgo.',
      'Tasa final asignada dentro del rango publicado según evaluación individual.'
    ],
    verificationStatus: 'verificado'
  },
  {
    id: 'davivienda_compra_cartera',
    entityId: 'davivienda',
    entityName: 'Banco Davivienda',
    commercialName: 'Crediexpress Fijo Compra de Cartera',
    officialUrl: 'https://www.davivienda.com',
    officialSource: 'Tarifario oficial Davivienda · Crédito de Consumo',
    effectiveDate: 'Referencia histórica 2024 · Pendiente de actualización 2026',
    isHistoricalTariff: true,
    rateType: 'from',
    rateMinMV: 1.29,
    rateMaxMV: null,
    rateMinEA: 16.63,
    rateMaxEA: null,
    rateDisplayMV: 'Compra de cartera desde 1,29 % M.V.',
    rateDisplayEA: 'Desde 16,63 % E.A.',
    minTerm: 12,
    maxTerm: 60,
    minAmount: 1000000,
    maxAmount: null,
    eligibleObligationTypes: ['tarjeta_credito', 'libre_inversion', 'credito_consumo'],
    canBuyOwnDebt: false,
    knownRestrictions: [
      'No compra obligaciones propias de Davivienda ni filiales del Grupo Bolívar.',
      'Tasa mínima reservada para segmentos preferentes y traslado de saldos de tarjeta de crédito.',
      'Sujeto a scoring crediticio y políticas de endeudamiento.'
    ],
    verificationStatus: 'verificado'
  },
  {
    id: 'banco_bogota_compra_cartera',
    entityId: 'banco_bogota',
    entityName: 'Banco de Bogotá',
    commercialName: 'Compra de Cartera Libre Destino',
    officialUrl: 'https://www.bancodebogota.com',
    officialSource: 'Tarifario oficial Banco de Bogotá · Grupo Aval',
    effectiveDate: 'Referencia histórica 2024 · Pendiente de actualización 2026',
    isHistoricalTariff: true,
    rateType: 'from',
    rateMinMV: 1.37,
    rateMaxMV: null,
    rateMinEA: 17.74,
    rateMaxEA: null,
    rateDisplayMV: 'Compra de cartera desde 1,37 % M.V.',
    rateDisplayEA: 'Desde 17,74 % E.A.',
    minTerm: 24,
    maxTerm: 72,
    minAmount: 1000000,
    maxAmount: null,
    eligibleObligationTypes: ['tarjeta_credito', 'libre_inversion', 'credito_consumo'],
    canBuyOwnDebt: false,
    knownRestrictions: [
      'No compra créditos ni tarjetas propias de Banco de Bogotá.',
      'Requiere extractos oficiales con saldo al día de las entidades a sustituir.',
      'Sin cobro por estudio de crédito; seguro de vida deudores obligatorio.'
    ],
    verificationStatus: 'verificado'
  },
  {
    id: 'bbva_compra_cartera',
    entityId: 'bbva_colombia',
    entityName: 'BBVA Colombia',
    commercialName: 'Préstamo Compra de Cartera Consumo',
    officialUrl: 'https://www.bbva.com.co/personas/productos/prestamos/consumo/compra-de-cartera.html',
    officialSource: 'Portal oficial BBVA Colombia · Préstamos',
    effectiveDate: 'Sin tasa pública · Sujeta a evaluación individual',
    isHistoricalTariff: false,
    rateType: 'custom',
    rateMinMV: null,
    rateMaxMV: null,
    rateMinEA: null,
    rateMaxEA: null,
    rateDisplayMV: 'Tasa sujeta a evaluación',
    rateDisplayEA: 'Tasa asignada según scoring de riesgo',
    minTerm: 12,
    maxTerm: 72,
    minAmount: 1500000,
    maxAmount: null,
    eligibleObligationTypes: ['tarjeta_credito', 'libre_inversion', 'credito_consumo'],
    canBuyOwnDebt: false,
    knownRestrictions: [
      'No compra deudas propias emitidas por BBVA Colombia.',
      'El banco no publica tasa única fija general en web; se informa durante la solicitud/evaluación.',
      'Aplica para personas naturales asalariadas o independientes con ingresos verificables.'
    ],
    verificationStatus: 'verificado_sin_tasa_publica'
  },
  {
    id: 'scotiabank_compra_cartera',
    entityId: 'scotiabank_colpatria',
    entityName: 'Scotiabank Colpatria',
    commercialName: 'Crédito de Consumo Compra de Cartera',
    officialUrl: 'https://www.scotiabankcolpatria.com',
    officialSource: 'Tarifario oficial Scotiabank Colpatria',
    effectiveDate: 'Sin tasa pública · Sujeta a evaluación individual',
    isHistoricalTariff: false,
    rateType: 'custom',
    rateMinMV: null,
    rateMaxMV: null,
    rateMinEA: null,
    rateMaxEA: null,
    rateDisplayMV: 'Tasa sujeta a evaluación',
    rateDisplayEA: 'Tasa asignada según perfil crediticio',
    minTerm: 12,
    maxTerm: 60,
    minAmount: 1000000,
    maxAmount: null,
    eligibleObligationTypes: ['tarjeta_credito', 'libre_inversion', 'credito_consumo'],
    canBuyOwnDebt: false,
    knownRestrictions: [
      'No compra cartera propia de Scotiabank Colpatria.',
      'Requiere certificación bancaria de deuda de la otra entidad financiera.',
      'Tasa final contractual definida según capacidad de endeudamiento.'
    ],
    verificationStatus: 'verificado_sin_tasa_publica'
  }
];

/**
 * Evalúa la posibilidad de consolidar el 100% de la cartera frente a todo el catálogo disponible.
 * Si ningún producto permite consolidar todas las obligaciones, explica el motivo y reporta la máxima cobertura posible.
 */
export function evaluatePortfolioFullCoverage(allDebts = []) {
  const debts = allDebts.filter(d => !d.isCancelled && d.status !== 'cancelada');
  const totalBalance = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
  const totalMonthlyPayment = debts.reduce((sum, d) => sum + (Number(d.monthlyPayment) || 0), 0);
  const totalCount = debts.length;

  if (totalCount === 0 || totalBalance === 0) {
    return {
      canAnyProductConsolidate100: false,
      productsWith100Coverage: [],
      maxCoveragePercentage: 0,
      bestCoverageProducts: [],
      explanation: 'No hay obligaciones activas registradas para evaluar consolidación.',
      totalBalance: 0,
      totalCount: 0,
      totalMonthlyPayment: 0
    };
  }

  const evaluations = REAL_PORTFOLIO_PRODUCTS.map(product => {
    const eligibility = evaluatePortfolioEligibility(product, debts);
    return {
      product,
      eligibility
    };
  });

  const productsWith100Coverage = evaluations.filter(e => e.eligibility.canConsolidate100Percent);
  const canAnyProductConsolidate100 = productsWith100Coverage.length > 0;

  let maxCoveragePercentage = 0;
  evaluations.forEach(e => {
    if (e.eligibility.consolidationPercentage > maxCoveragePercentage) {
      maxCoveragePercentage = e.eligibility.consolidationPercentage;
    }
  });

  const bestCoverage = evaluations.filter(e => e.eligibility.consolidationPercentage === maxCoveragePercentage);

  let explanation = '';
  if (canAnyProductConsolidate100) {
    const bankNames = productsWith100Coverage.map(e => e.product.entityName).join(', ');
    explanation = `Consolidación total (100%) viable con: ${bankNames}. Permiten consolidar las ${pluralizeObligations(totalCount)} por ${formatCOP(totalBalance)}.`;
  } else {
    const distinctEntities = [...new Set(debts.map(d => d.entity || d.entityName || 'Entidad'))];
    explanation = `Ninguna entidad en el catálogo puede consolidar el 100 % de tu cartera (${formatCOP(totalBalance)} en ${pluralizeDebts(totalCount)}). Motivo técnico: los bancos colombianos no compran su propia cartera interna (tienes obligaciones con ${distinctEntities.join(', ')}) o aplican restricciones por modalidad. Cobertura máxima elegible en una sola entidad: ${maxCoveragePercentage} %.`;
  }

  return {
    canAnyProductConsolidate100,
    productsWith100Coverage: productsWith100Coverage.map(e => e.product),
    maxCoveragePercentage,
    bestCoverageProducts: bestCoverage.map(e => ({ product: e.product, eligibility: e.eligibility })),
    explanation,
    totalBalance,
    totalCount,
    totalMonthlyPayment
  };
}

/**
 * Evalúa la elegibilidad de las deudas del usuario frente a un producto específico de compra de cartera.
 * Regla de negocio colombiana: los bancos compran deudas de OTRAS entidades, no sus propias obligaciones.
 */
export function evaluatePortfolioEligibility(product, allDebts = []) {
  const debts = allDebts.filter(d => !d.isCancelled && d.status !== 'cancelada');
  const eligibleDebts = [];
  const excludedDebts = [];

  const totalOriginalDebt = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
  const totalOriginalMonthlyPayment = debts.reduce((sum, d) => sum + (Number(d.monthlyPayment) || 0), 0);
  const totalDebtsCount = debts.length;

  for (const debt of debts) {
    // 1. Verificar si es deuda propia de la entidad
    const isOwnDebt = debt.entity === product.entityId || 
                      (debt.entityName && debt.entityName.toLowerCase().includes(product.entityName.toLowerCase())) ||
                      (debt.entity && debt.entity.toLowerCase().includes(product.entityId.toLowerCase()));

    if (isOwnDebt && !product.canBuyOwnDebt) {
      excludedDebts.push({
        debt,
        reason: `Deuda propia de ${product.entityName}. Los bancos en Colombia no trasladan sus propias obligaciones vía compra de cartera.`
      });
      continue;
    }

    // 2. Verificar tipo de obligación elegible
    const isEligibleType = product.eligibleObligationTypes.includes(debt.type);
    if (!isEligibleType) {
      excludedDebts.push({
        debt,
        reason: `Modalidad (${debt.type || 'no especificada'}) no cubierta por este producto.`
      });
      continue;
    }

    eligibleDebts.push(debt);
  }

  const eligibleBalance = eligibleDebts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
  const excludedBalance = excludedDebts.reduce((sum, item) => sum + (Number(item.debt.balance) || 0), 0);
  const eligibleCurrentMonthlyPayment = eligibleDebts.reduce((sum, d) => sum + (Number(d.monthlyPayment) || 0), 0);
  const excludedMonthlyPayment = excludedDebts.reduce((sum, item) => sum + (Number(item.debt.monthlyPayment) || 0), 0);

  const consolidationPercentage = totalOriginalDebt > 0 
    ? Number(((eligibleBalance / totalOriginalDebt) * 100).toFixed(1)) 
    : 0;
  const canConsolidate100Percent = totalDebtsCount > 0 && eligibleDebts.length === totalDebtsCount && eligibleBalance === totalOriginalDebt;

  const meetsMinAmount = eligibleBalance >= product.minAmount;
  const isEligible = eligibleDebts.length > 0 && meetsMinAmount;

  let ineligibilityReason = null;
  if (eligibleDebts.length === 0) {
    ineligibilityReason = `Todas tus obligaciones pertenecen a ${product.entityName} o no son elegibles para compra de cartera.`;
  } else if (!meetsMinAmount) {
    ineligibilityReason = `El saldo elegible (${formatCOP(eligibleBalance)}) no alcanza el monto mínimo de ${formatCOP(product.minAmount)}.`;
  }

  let reason100PercentNotPossible = null;
  if (!canConsolidate100Percent && totalDebtsCount > 0) {
    const ownExcluded = excludedDebts.filter(ex => ex.reason.includes('Deuda propia'));
    const typeExcluded = excludedDebts.filter(ex => !ex.reason.includes('Deuda propia'));
    const reasons = [];
    if (ownExcluded.length > 0) {
      reasons.push(`${ownExcluded.length} deuda(s) son con ${product.entityName} (no compra cartera propia)`);
    }
    if (typeExcluded.length > 0) {
      reasons.push(`${typeExcluded.length} deuda(s) tienen modalidades excluidas`);
    }
    reason100PercentNotPossible = `Consolida el ${consolidationPercentage} % de la cartera. Motivo: ${reasons.join(', ')}.`;
  }

  return {
    isEligible,
    ineligibilityReason,
    totalOriginalDebt,
    totalOriginalMonthlyPayment,
    totalDebtsCount,
    eligibleDebts,
    excludedDebts,
    eligibleBalance,
    excludedBalance,
    eligibleCount: eligibleDebts.length,
    excludedCount: excludedDebts.length,
    eligibleCurrentMonthlyPayment,
    excludedMonthlyPayment,
    consolidationPercentage,
    canConsolidate100Percent,
    reason100PercentNotPossible
  };
}

/**
 * Calcula la simulación financiera de compra de cartera para un producto y un saldo elegible.
 * Para productos con tasa en rango (ej. Bancolombia): genera escenario mínimo y máximo.
 * Para productos con tasa 'desde' (ej. Davivienda): genera escenario con tasa mínima publicada.
 * Para productos sin tasa pública (ej. BBVA): marca que la cuota está sujeta a estudio y no inventa números.
 * 
 * FÓRMULAS FINANCIERAS OBLIGATORIAS:
 * - Pago mensual total posterior = cuota nuevo crédito + suma de cuotas de obligaciones que continúan activas
 * - Ahorro mensual real = pago mensual total actual - pago mensual total posterior
 */
export function calculateProductSimulation(product, eligibility, desiredTerm = null, userGoal = 'lower_payment') {
  const capital = eligibility.eligibleBalance;
  const excludedMonthlyPayment = eligibility.excludedMonthlyPayment || 0;
  const totalOriginalMonthlyPayment = eligibility.totalOriginalMonthlyPayment || 
    (eligibility.eligibleCurrentMonthlyPayment + excludedMonthlyPayment);
  
  // Número de obligaciones activas que resultarían:
  // 1 (el nuevo crédito de consolidación) + deudas no cubiertas que permanecen activas
  const activeObligationsAfterOperation = eligibility.isEligible ? (1 + eligibility.excludedCount) : eligibility.totalDebtsCount;

  if (!eligibility.isEligible || capital <= 0) {
    return {
      isCalculable: false,
      reason: eligibility.ineligibilityReason || 'No cumple requisitos mínimos de consolidación.',
      totalOriginalMonthlyPayment,
      remainingActiveMonthlyPayment: excludedMonthlyPayment,
      activeObligationsAfterOperation: eligibility.totalDebtsCount,
      pagoMensualTotalPosterior: totalOriginalMonthlyPayment,
      ahorroMensualReal: 0
    };
  }

  // Determinar plazo propuesto según objetivo y límites del producto
  let term = desiredTerm;
  if (!term) {
    if (userGoal === 'finish_fast') {
      term = Math.max(product.minTerm, 24);
    } else if (userGoal === 'lower_payment') {
      term = Math.min(product.maxTerm, 60);
    } else if (userGoal === 'similar_term') {
      term = Math.max(product.minTerm, Math.min(product.maxTerm, 36));
    } else {
      term = 36;
    }
  }
  term = Math.max(product.minTerm, Math.min(product.maxTerm, term));

  // Caso: Tasa no publicada por el banco (personalizada tras estudio)
  if (product.rateType === 'custom' || product.rateMinEA === null) {
    const scenarioCustom = calculateConsolidationScenarioSummary({
      newCredit: { monthlyPayment: null, termMonths: term, oneTimeCharges: 0 },
      remainingDebts: eligibility.excludedDebts
    });
    return {
      isCalculable: true,
      hasPublishedRate: false,
      termMonths: term,
      capital,
      rateDisplayMV: product.rateDisplayMV,
      rateDisplayEA: product.rateDisplayEA,
      cuotaMensual: null,
      cuotaMin: null,
      cuotaMax: null,
      costoTotal: null,
      interesesTotales: null,
      monthlyDifference: null,
      remainingActiveMonthlyPayment: excludedMonthlyPayment,
      pagoMensualTotalPosterior: null, // Por definir tras estudio
      ahorroMensualReal: null,
      scenarioTotalFuturePayment: null,
      scenarioTotalFuturePaymentMin: null,
      scenarioTotalFuturePaymentMax: null,
      scenarioLastPaymentMonth: scenarioCustom.scenarioLastPaymentMonth,
      scenarioTimelineSegments: [],
      remainingDebtsTotalFuturePayment: scenarioCustom.remainingDebtsTotalFuturePayment,
      remainingDebtsLastMonth: scenarioCustom.remainingDebtsLastMonth,
      remainingDebtsCostCalculable: scenarioCustom.remainingDebtsCostCalculable,
      remainingDebtsUncalculableReason: scenarioCustom.remainingDebtsUncalculableReason,
      applicableCharges: 0,
      activeObligationsAfterOperation,
      isPartialConsolidation: !eligibility.canConsolidate100Percent,
      explanation: 'Tasa y cuota definitivas son informadas exclusivamente por la entidad tras el estudio de crédito.'
    };
  }

  // Caso: Tasa en rango (ej. Bancolombia)
  if (product.rateType === 'range' && product.rateMaxEA !== null) {
    const cuotaMin = calculateAmortizationMonthlyPayment(capital, product.rateMinEA, term);
    const cuotaMax = calculateAmortizationMonthlyPayment(capital, product.rateMaxEA, term);
    const totalCostMin = cuotaMin * term;
    const totalCostMax = cuotaMax * term;
    const interestMin = totalCostMin - capital;
    const interestMax = totalCostMax - capital;

    const scenarioMin = calculateConsolidationScenarioSummary({
      newCredit: { monthlyPayment: cuotaMin, termMonths: term, oneTimeCharges: 0 },
      remainingDebts: eligibility.excludedDebts
    });
    const scenarioMax = calculateConsolidationScenarioSummary({
      newCredit: { monthlyPayment: cuotaMax, termMonths: term, oneTimeCharges: 0 },
      remainingDebts: eligibility.excludedDebts
    });

    // FÓRMULA OBLIGATORIA:
    // Pago mensual total posterior = cuota nuevo crédito + cuotas de obligaciones que continúan activas
    const pagoMensualTotalPosteriorMin = cuotaMin + excludedMonthlyPayment;
    const pagoMensualTotalPosteriorMax = cuotaMax + excludedMonthlyPayment;

    // FÓRMULA OBLIGATORIA DE AHORRO MENSUAL REAL:
    // Ahorro mensual real = pago mensual total actual - pago mensual total posterior
    const ahorroMensualRealMax = totalOriginalMonthlyPayment - pagoMensualTotalPosteriorMin;
    const ahorroMensualRealMin = totalOriginalMonthlyPayment - pagoMensualTotalPosteriorMax;

    return {
      isCalculable: true,
      hasPublishedRate: true,
      isRange: true,
      termMonths: term,
      capital,
      rateMinEA: product.rateMinEA,
      rateMaxEA: product.rateMaxEA,
      rateMinMV: product.rateMinMV,
      rateMaxMV: product.rateMaxMV,
      rateDisplayMV: product.rateDisplayMV,
      rateDisplayEA: product.rateDisplayEA,
      cuotaMensual: cuotaMin, // Escenario base (desde)
      cuotaMin,
      cuotaMax,
      remainingActiveMonthlyPayment: excludedMonthlyPayment,
      remainingActiveCuotas: excludedMonthlyPayment,
      pagoMensualTotalPosterior: pagoMensualTotalPosteriorMin,
      pagoMensualTotalPosteriorMin,
      pagoMensualTotalPosteriorMax,
      ahorroMensualReal: ahorroMensualRealMax,
      ahorroMensualRealMin,
      ahorroMensualRealMax,
      costoTotal: totalCostMin,
      costoTotalMin: totalCostMin,
      costoTotalMax: totalCostMax,
      interesesTotales: interestMin,
      interesesMin: interestMin,
      interesesMax: interestMax,
      scenarioTotalFuturePayment: scenarioMin.scenarioTotalFuturePayment,
      scenarioTotalFuturePaymentMin: scenarioMin.scenarioTotalFuturePayment,
      scenarioTotalFuturePaymentMax: scenarioMax.scenarioTotalFuturePayment,
      scenarioLastPaymentMonth: scenarioMin.scenarioLastPaymentMonth,
      scenarioTimelineSegments: scenarioMin.timelineSegments,
      scenarioTimelineSegmentsMax: scenarioMax.timelineSegments,
      remainingDebtsTotalFuturePayment: scenarioMin.remainingDebtsTotalFuturePayment,
      remainingDebtsLastMonth: scenarioMin.remainingDebtsLastMonth,
      remainingDebtsCostCalculable: scenarioMin.remainingDebtsCostCalculable,
      remainingDebtsUncalculableReason: scenarioMin.remainingDebtsUncalculableReason,
      applicableCharges: 0,
      monthlyDifference: ahorroMensualRealMax,
      activeObligationsAfterOperation,
      isPartialConsolidation: !eligibility.canConsolidate100Percent,
      explanation: `Simulación con tasa publicada entre ${product.rateMinMV} % y ${product.rateMaxMV} % M.V. a ${term} meses.`
    };
  }

  // Caso: Tasa "desde" (ej. Davivienda, Banco de Bogotá)
  const cuota = calculateAmortizationMonthlyPayment(capital, product.rateMinEA, term);
  const totalCost = cuota * term;
  const totalInterest = totalCost - capital;

  const scenarioSingle = calculateConsolidationScenarioSummary({
    newCredit: { monthlyPayment: cuota, termMonths: term, oneTimeCharges: 0 },
    remainingDebts: eligibility.excludedDebts
  });

  // FÓRMULA OBLIGATORIA:
  // Pago mensual total posterior = cuota nuevo crédito + suma de cuotas de obligaciones que continúan activas
  const pagoMensualTotalPosterior = cuota + excludedMonthlyPayment;

  // FÓRMULA OBLIGATORIA DE AHORRO MENSUAL REAL:
  // Ahorro mensual real = pago mensual total actual - pago mensual total posterior
  const ahorroMensualReal = totalOriginalMonthlyPayment - pagoMensualTotalPosterior;

  return {
    isCalculable: true,
    hasPublishedRate: true,
    isRange: false,
    termMonths: term,
    capital,
    rateMinEA: product.rateMinEA,
    rateMinMV: product.rateMinMV,
    rateDisplayMV: product.rateDisplayMV,
    rateDisplayEA: product.rateDisplayEA,
    cuotaMensual: cuota,
    cuotaMin: cuota,
    cuotaMax: cuota,
    remainingActiveMonthlyPayment: excludedMonthlyPayment,
    remainingActiveCuotas: excludedMonthlyPayment,
    pagoMensualTotalPosterior,
    ahorroMensualReal,
    costoTotal: totalCost,
    costoTotalMin: totalCost,
    costoTotalMax: totalCost,
    interesesTotales: totalInterest,
    interesesMin: totalInterest,
    interesesMax: totalInterest,
    scenarioTotalFuturePayment: scenarioSingle.scenarioTotalFuturePayment,
    scenarioTotalFuturePaymentMin: scenarioSingle.scenarioTotalFuturePayment,
    scenarioTotalFuturePaymentMax: scenarioSingle.scenarioTotalFuturePayment,
    scenarioLastPaymentMonth: scenarioSingle.scenarioLastPaymentMonth,
    scenarioTimelineSegments: scenarioSingle.timelineSegments,
    remainingDebtsTotalFuturePayment: scenarioSingle.remainingDebtsTotalFuturePayment,
    remainingDebtsLastMonth: scenarioSingle.remainingDebtsLastMonth,
    remainingDebtsCostCalculable: scenarioSingle.remainingDebtsCostCalculable,
    remainingDebtsUncalculableReason: scenarioSingle.remainingDebtsUncalculableReason,
    applicableCharges: 0,
    monthlyDifference: ahorroMensualReal,
    activeObligationsAfterOperation,
    isPartialConsolidation: !eligibility.canConsolidate100Percent,
    explanation: `Simulación con tasa base desde ${product.rateMinMV} % M.V. a ${term} meses.`
  };
}

/**
 * Genera el listado completo y ordenado de alternativas reales de compra de cartera
 * a partir de las obligaciones registradas por el usuario.
 */
export function generateRealPortfolioComparisons(debts = [], userGoal = 'lower_payment', rejectedAlternativeIds = []) {
  const comparisons = [];

  for (const product of REAL_PORTFOLIO_PRODUCTS) {
    // Si fue rechazada manualmente previamente por el usuario, omitirla del ranking activo
    const isRejected = rejectedAlternativeIds.includes(product.id);
    if (isRejected) continue;

    const eligibility = evaluatePortfolioEligibility(product, debts);
    const simulation = calculateProductSimulation(product, eligibility, null, userGoal);

    comparisons.push({
      product,
      eligibility,
      simulation,
      id: product.id,
      entity: product.entityName,
      commercialName: product.commercialName,
      productType: product.commercialName || 'Producto por confirmar',
      isHistoricalTariff: Boolean(product.isHistoricalTariff),
      officialUrl: product.officialUrl,
      officialSource: product.officialSource,
      effectiveDate: product.effectiveDate,
      verificationStatus: product.verificationStatus,
      isDemo: false,
      originType: 'real_colombia',
      canConsolidate100Percent: eligibility.canConsolidate100Percent,
      consolidationPercentage: eligibility.consolidationPercentage,
      cuotaMensual: simulation.cuotaMensual,
      cuotaMin: simulation.cuotaMin,
      cuotaMax: simulation.cuotaMax,
      plazoMeses: simulation.termMonths,
      montoConsolidar: eligibility.eligibleBalance,
      pagoMensualTotalPosterior: simulation.pagoMensualTotalPosterior,
      ahorroMensualReal: simulation.ahorroMensualReal,
      reduccionPagoMensual: simulation.ahorroMensualReal,
      scenarioTotalFuturePayment: simulation.scenarioTotalFuturePayment ?? null,
      scenarioTotalFuturePaymentMin: simulation.scenarioTotalFuturePaymentMin ?? null,
      scenarioTotalFuturePaymentMax: simulation.scenarioTotalFuturePaymentMax ?? null,
      scenarioLastPaymentMonth: simulation.scenarioLastPaymentMonth ?? null,
      scenarioTimelineSegments: simulation.scenarioTimelineSegments || [],
      remainingDebtsTotalFuturePayment: simulation.remainingDebtsTotalFuturePayment ?? 0,
      remainingDebtsLastMonth: simulation.remainingDebtsLastMonth ?? 0,
      remainingDebtsCostCalculable: simulation.remainingDebtsCostCalculable ?? true,
      remainingDebtsUncalculableReason: simulation.remainingDebtsUncalculableReason ?? null,
      applicableCharges: simulation.applicableCharges ?? 0,
      rateMinEA: simulation.rateMinEA ?? product.rateMinEA ?? null,
      rateMaxEA: simulation.rateMaxEA ?? product.rateMaxEA ?? null,
      rateDisplayEA: product.rateDisplayEA,
      rateDisplayMV: product.rateDisplayMV,
      activeObligationsAfterOperation: simulation.activeObligationsAfterOperation,
      remainingActiveMonthlyPayment: eligibility.excludedMonthlyPayment,
      obligacionesCubiertasCount: eligibility.eligibleCount,
      obligacionesExcluidasCount: eligibility.excludedCount
    });
  }

  // Ordenar alternativas según el objetivo del usuario
  comparisons.sort((a, b) => {
    // Primero las que son elegibles
    if (a.eligibility.isEligible && !b.eligibility.isEligible) return -1;
    if (!a.eligibility.isEligible && b.eligibility.isEligible) return 1;

    // Si ambas son elegibles:
    if (a.eligibility.isEligible && b.eligibility.isEligible) {
      // Priorizar productos con tasa verificada sobre tasas sin publicar
      if (a.simulation.hasPublishedRate && !b.simulation.hasPublishedRate) return -1;
      if (!a.simulation.hasPublishedRate && b.simulation.hasPublishedRate) return 1;

      if (a.simulation.hasPublishedRate && b.simulation.hasPublishedRate) {
        if (userGoal === 'lower_payment') {
          // Menor PAGO MENSUAL TOTAL POSTERIOR
          return (a.simulation.pagoMensualTotalPosterior || 999999999) - (b.simulation.pagoMensualTotalPosterior || 999999999);
        } else if (userGoal === 'finish_fast') {
          // Menor costo total en intereses
          return (a.simulation.interesesTotales || 999999999) - (b.simulation.interesesTotales || 999999999);
        } else {
          // Mayor ahorro mensual real
          return (b.simulation.ahorroMensualReal || 0) - (a.simulation.ahorroMensualReal || 0);
        }
      }
    }

    return 0;
  });

  // Marcar la mejor alternativa justificada si cumple condiciones
  const firstEligibleWithRate = comparisons.find(c => c.eligibility.isEligible && c.simulation.hasPublishedRate);
  if (firstEligibleWithRate && userGoal !== 'explore') {
    firstEligibleWithRate.isTopMatch = true;
    firstEligibleWithRate.topMatchReason = userGoal === 'lower_payment' 
      ? 'Ofrece el menor pago mensual total posterior estimado entre las tasas publicadas.'
      : 'Ofrece el menor costo proyectado en intereses con tasa verificada.';
  }

  return comparisons;
}
