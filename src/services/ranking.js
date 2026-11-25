import { calculateAmortizationMonthlyPayment } from './calculations.js';
export { 
  REAL_PORTFOLIO_PRODUCTS, 
  evaluatePortfolioEligibility, 
  calculateProductSimulation, 
  generateRealPortfolioComparisons,
  evaluatePortfolioFullCoverage
} from './portfolioProducts.js';

export const GOALS = {
  finish_fast: {
    id: 'finish_fast',
    title: 'Terminar de pagar más rápido',
    shortTitle: 'Terminar más rápido',
    description: 'Quiero reducir el tiempo que permaneceré endeudado.',
    icon: 'Zap',
    priorityMetric: 'Menor plazo de pago'
  },
  lower_payment: {
    id: 'lower_payment',
    title: 'Pagar menos cada mes',
    shortTitle: 'Pagar menos cada mes',
    description: 'Quiero reducir la presión de mis pagos mensuales.',
    icon: 'TrendingDown',
    priorityMetric: 'Menor cuota mensual'
  },
  similar_term: {
    id: 'similar_term',
    title: 'Mantener un plazo parecido',
    shortTitle: 'Mantener plazo similar',
    description: 'Quiero evitar extender demasiado mis deudas y buscar mejores condiciones dentro de un plazo similar.',
    icon: 'Scale',
    priorityMetric: 'Plazo equilibrado con mejor tasa'
  },
  explore: {
    id: 'explore',
    title: 'No sé qué me conviene',
    shortTitle: 'Explorar escenarios',
    description: 'Quiero comparar diferentes escenarios antes de decidir qué priorizar.',
    icon: 'Compass',
    priorityMetric: 'Comparativa integral de escenarios'
  }
};

/**
 * Genera alternativas mock dinámicas pero coherentes basadas en el saldo del snapshot
 * utilizando amortización fija estándar francesa.
 */
export function generateMockAlternatives(snapshot) {
  const total = snapshot.totalBalance || 15000000;
  const currentPay = snapshot.totalMonthlyPayment || 950000;
  const currentTerm = snapshot.estimatedTermMonths || 24;

  // Alternativa A: Terminar antes (Plazo menor, cuota algo mayor o similar, menor costo de interés)
  const termA = Math.max(12, Math.round(currentTerm * 0.65));
  const rateA = 19.5; // Compra de cartera tasa preferencial
  const cuotaA = calculateAmortizationMonthlyPayment(total, rateA, termA) || Math.round((total / termA) * 1.09);
  const costA = Math.round(cuotaA * termA);

  // Alternativa B: Liberar flujo mensual (Cuota significativamente menor, plazo mayor)
  const termB = Math.max(36, Math.round(currentTerm * 1.6));
  const rateB = 21.2;
  const cuotaB = calculateAmortizationMonthlyPayment(total, rateB, termB) || Math.round(currentPay * 0.68);
  const costB = Math.round(cuotaB * termB);

  // Alternativa C: Equilibrio (Plazo cercano al actual, cuota algo menor)
  const termC = Math.max(18, Math.round(currentTerm * 0.95));
  const rateC = 20.4;
  const cuotaC = calculateAmortizationMonthlyPayment(total, rateC, termC) || Math.round(currentPay * 0.84);
  const costC = Math.round(cuotaC * termC);

  return [
    {
      id: 'alt_a',
      entity: 'Entidad Financiera Futuro (Demostración)',
      productType: 'Compra de Cartera Preferente',
      scenarioType: 'terminar_antes',
      tagline: 'Terminar antes',
      rateEA: rateA,
      cuotaMensual: cuotaA,
      plazoMeses: termA,
      costoTotalEstimado: costA,
      montoConsolidar: total,
      obligacionesCubiertasCount: snapshot.totalCount || 3,
      natureLabel: 'Simulación demostrativa (Mock)',
      isDemo: true,
      originType: 'demo',
      simulatedRequirements: [
        'Ingreso mensual demostrativo desde 1.8 SMMLV',
        'Antigüedad laboral mínima de 6 meses',
        'Sujeto a políticas de crédito de la entidad'
      ]
    },
    {
      id: 'alt_b',
      entity: 'Banco Progresar (Demostración)',
      productType: 'Crédito de Consolidación Ágil',
      scenarioType: 'menor_cuota',
      tagline: 'Liberar flujo mensual',
      rateEA: rateB,
      cuotaMensual: cuotaB,
      plazoMeses: termB,
      costoTotalEstimado: costB,
      montoConsolidar: total,
      obligacionesCubiertasCount: snapshot.totalCount || 3,
      natureLabel: 'Simulación demostrativa (Mock)',
      isDemo: true,
      originType: 'demo',
      simulatedRequirements: [
        'Ingreso mensual demostrativo desde 1.5 SMMLV',
        'Capacidad de endeudamiento vigente',
        'Sujeto a evaluación de la entidad'
      ]
    },
    {
      id: 'alt_c',
      entity: 'Cooperativa Aliada Financiera (Demostración)',
      productType: 'Refinanciación Integral Solidaria',
      scenarioType: 'equilibrio',
      tagline: 'Mantener equilibrio',
      rateEA: rateC,
      cuotaMensual: cuotaC,
      plazoMeses: termC,
      costoTotalEstimado: costC,
      montoConsolidar: total,
      obligacionesCubiertasCount: snapshot.totalCount || 3,
      natureLabel: 'Simulación demostrativa (Mock)',
      isDemo: true,
      originType: 'demo',
      simulatedRequirements: [
        'Vinculación o asociación a la entidad',
        'Ingresos demostrables como empleado o independiente',
        'Sujeto a estudio de viabilidad'
      ]
    }
  ];
}

/**
 * Ordena y explica determinísticamente las alternativas según el objetivo del usuario
 */
export function rankAlternatives(alternatives = [], userGoal = 'explore', snapshot = {}, excludedIds = []) {
  // Filtrar o separar alternativas excluidas (por ejemplo por rechazo previo)
  const activeAlts = alternatives.filter(a => !excludedIds.includes(a.id));
  const excludedAlts = alternatives.filter(a => excludedIds.includes(a.id));

  let sorted = [...activeAlts];
  let isExplore = (userGoal === 'explore');

  if (userGoal === 'finish_fast') {
    // Menor plazo primero
    sorted.sort((a, b) => a.plazoMeses - b.plazoMeses);
  } else if (userGoal === 'lower_payment') {
    // Menor cuota mensual primero
    sorted.sort((a, b) => a.cuotaMensual - b.cuotaMensual);
  } else if (userGoal === 'similar_term') {
    // Menor diferencia respecto al plazo estimado actual
    const targetTerm = snapshot.estimatedTermMonths || 24;
    sorted.sort((a, b) => {
      const diffA = Math.abs(a.plazoMeses - targetTerm);
      const diffB = Math.abs(b.plazoMeses - targetTerm);
      return diffA - diffB;
    });
  }

  // Generar explicaciones detalladas para cada alternativa en este orden
  const ranked = sorted.map((alt, index) => {
    const isTopMatch = !isExplore && index === 0;
    let rankReason = '';
    let whatYouGain = '';
    let whatYouMustConsider = '';

    if (userGoal === 'finish_fast') {
      if (isTopMatch) {
        rankReason = 'Esta alternativa aparece primero porque seleccionaste como prioridad terminar tus deudas más rápido y presenta el menor plazo entre las alternativas comparadas.';
        whatYouGain = `Terminarías de pagar en ${alt.plazoMeses} meses, reduciendo el tiempo total con deuda.`;
        whatYouMustConsider = 'Un plazo menor puede requerir una cuota mensual mayor o similar a la actual. Revisa que se ajuste a tu presupuesto.';
      } else {
        rankReason = `Alternativa con plazo de ${alt.plazoMeses} meses para comparación.`;
        whatYouGain = 'Mayor plazo que la primera opción, lo cual amortigua la cuota mensual.';
        whatYouMustConsider = 'Permanecerás más meses pagando cuotas.';
      }
    } else if (userGoal === 'lower_payment') {
      if (isTopMatch) {
        rankReason = 'Esta alternativa aparece primero porque seleccionaste reducir tu pago mensual y presenta la menor cuota estimada entre las alternativas comparadas.';
        whatYouGain = `Liberas flujo de caja mensual con una cuota aproximada de $ ${alt.cuotaMensual.toLocaleString('es-CO')}.`;
        whatYouMustConsider = 'Una cuota menor puede requerir un plazo mayor (en este caso ' + alt.plazoMeses + ' meses) y modificar el costo total de intereses.';
      } else {
        rankReason = 'Alternativa intermedia con cuota moderada y menor extensión de plazo.';
        whatYouGain = 'Menor extensión del plazo total frente a la opción de cuota más baja.';
        whatYouMustConsider = 'La cuota mensual es superior a la opción principal de este objetivo.';
      }
    } else if (userGoal === 'similar_term') {
      if (isTopMatch) {
        rankReason = `Esta alternativa aparece primero porque seleccionaste mantener un plazo parecido al actual (~${snapshot.estimatedTermMonths || 24} meses) y su plazo de ${alt.plazoMeses} meses es el más cercano.`;
        whatYouGain = 'Mantienes el horizonte de tiempo que ya tenías proyectado, buscando consolidar con mejor tasa y una cuota equilibrada.';
        whatYouMustConsider = 'No reduce el plazo radicalmente ni baja la cuota al mínimo posible; busca un balance medio.';
      } else {
        rankReason = 'Alternativa con mayor desviación de plazo para contrastar opciones.';
        whatYouGain = 'Permite evaluar si prefieres acelerar el pago o bajar más la cuota.';
        whatYouMustConsider = 'Se aleja más del plazo original que tienes hoy.';
      }
    } else {
      // Modo exploratorio: no hay ganador único
      rankReason = `Escenario de ${alt.tagline.toLowerCase()}: diseñado para evaluar este camino sin preconceptos.`;
      whatYouGain = `Enfoque centrado en ${alt.tagline.toLowerCase()}.`;
      whatYouMustConsider = 'Analiza si este balance se adapta a tus metas de los próximos meses.';
    }

    return {
      ...alt,
      isTopMatch,
      rankPosition: index + 1,
      rankReason,
      whatYouGain,
      whatYouMustConsider
    };
  });

  return {
    ranked,
    excluded: excludedAlts,
    isExplore,
    userGoal
  };
}
