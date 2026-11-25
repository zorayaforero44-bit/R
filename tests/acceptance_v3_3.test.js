import test from 'node:test';
import assert from 'node:assert';

// Entorno mínimo de navegador para probar tanto servicios como pantallas reales de app.js
const memoryStorage = {};
globalThis.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(memoryStorage, k) ? memoryStorage[k] : null),
  setItem: (k, v) => { memoryStorage[k] = String(v); },
  removeItem: (k) => { delete memoryStorage[k]; },
  clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
};

const domElements = {};
const domListeners = {};
globalThis.window = {
  scrollTo: () => {}
};
globalThis.document = {
  getElementById: (id) => domElements[id] || null,
  querySelector: () => null,
  addEventListener: (evt, cb) => { domListeners[evt] = cb; },
  createElement: () => ({ id: '', className: '', innerHTML: '', style: {}, parentNode: null, remove: () => {} }),
  body: { appendChild: () => {} }
};

import {
  calculateSnapshot,
  calculateTradeOff,
  calculateConsolidationScenarioSummary,
  projectCurrentDebtsTimeline
} from '../src/services/calculations.js';
import {
  REAL_PORTFOLIO_PRODUCTS,
  evaluatePortfolioEligibility,
  calculateProductSimulation
} from '../src/services/portfolioProducts.js';
import { AnalyticsProvider } from '../src/services/analytics.js';
import { StorageService } from '../src/services/storage.js';

test('Criterio 1 — Plazos distintos: dos deudas sin intereses ni cargos ($100.000 c/u a 3 y 12 cuotas)', () => {
  const debts = [
    {
      id: 'd_short',
      entity: 'Entidad A',
      entityName: 'Entidad A',
      type: 'libre_inversion',
      productType: 'libre_inversion',
      balance: 300000,
      monthlyPayment: 100000,
      rateEA: 0,
      knowsRate: true,
      isEstimated: false,
      rateSourceType: 'user_reported',
      termMonths: 3,
      oneTimeCharges: 0,
      monthlyFees: 0
    },
    {
      id: 'd_long',
      entity: 'Entidad B',
      entityName: 'Entidad B',
      type: 'credito_consumo',
      productType: 'credito_consumo',
      balance: 1200000,
      monthlyPayment: 100000,
      rateEA: 0,
      knowsRate: true,
      isEstimated: false,
      rateSourceType: 'user_reported',
      termMonths: 12,
      oneTimeCharges: 0,
      monthlyFees: 0
    }
  ];

  const timeline = projectCurrentDebtsTimeline(debts);
  const snapshot = calculateSnapshot(debts);

  assert.strictEqual(snapshot.isCostCalculable, true);
  assert.strictEqual(snapshot.initialJointPayment, 200000, 'Cuota conjunta inicial debe ser $200.000');
  assert.strictEqual(snapshot.estimatedRemainingCost, 1500000, 'Total pendiente debe ser $1.500.000');
  assert.strictEqual(snapshot.lastPaymentMonth, 12, 'Último pago debe ocurrir en el mes 12');

  // Meses 1 a 3: $200.000; Meses 4 a 12: $100.000
  for (let m = 1; m <= 3; m++) {
    assert.strictEqual(timeline.monthlyTimeline[m - 1].totalPayment, 200000, `Mes ${m} debe sumar $200.000`);
  }
  for (let m = 4; m <= 12; m++) {
    assert.strictEqual(timeline.monthlyTimeline[m - 1].totalPayment, 100000, `Mes ${m} debe sumar $100.000`);
  }

  assert.deepStrictEqual(snapshot.timelineSegments, [
    { fromMonth: 1, toMonth: 3, monthlyPayment: 200000, activeCount: 2 },
    { fromMonth: 4, toMonth: 12, monthlyPayment: 100000, activeCount: 1 }
  ]);
});

test('Criterio 2 — Oferta incompleta ("Dato pendiente") y preservación de tasa 0 % al guardar, comparar y recargar', async () => {
  localStorage.clear();
  const rootEl = { innerHTML: '' };
  domElements['app-root'] = rootEl;

  // Inicializar estado con 1 solicitud basada en BBVA (sin tasa pública ni cuota simulada)
  const initialState = {
    debts: [
      {
        id: 'd1',
        entity: 'Bancolombia',
        entityName: 'Bancolombia',
        type: 'tarjeta_credito',
        productType: 'tarjeta_credito',
        balance: 6000000,
        monthlyPayment: 500000,
        rateEA: 20,
        knowsRate: true,
        isEstimated: false,
        rateSourceType: 'user_reported',
        termMonths: 14
      }
    ],
    userGoal: 'lower_payment',
    dataOrigin: 'participant',
    selectedAlternativeId: 'bbva_compra_cartera',
    applications: [
      {
        id: 'app_bbva_1',
        fecha: new Date().toISOString(),
        entidad: 'BBVA Colombia',
        producto: 'Préstamo Compra de Cartera Consumo',
        montoSolicitado: 6000000,
        cuotaEstimada: null,
        plazoEstimado: 60,
        tasaIndicativaEA: null,
        costoTotalEstimado: null,
        tasaFuente: 'Portal oficial BBVA Colombia · Préstamos',
        tasaFechaReferencia: 'Sin tasa pública · Sujeta a evaluación individual',
        objetivoOriginal: 'lower_payment',
        alternativeId: 'bbva_compra_cartera',
        status: 'aprobada'
      }
    ],
    acceptedRestructuring: null,
    currentScreen: 'final_offer_input',
    activeCheckIn: null,
    temporaryOffer: null,
    activeApplicationIdForOutcome: 'app_bbva_1'
  };
  StorageService.saveState(initialState);

  await import('../src/app.js');
  if (domListeners['DOMContentLoaded']) {
    domListeners['DOMContentLoaded']();
  }

  // Verificar que renderFinalOfferInputScreen no inyecta 20% ni $720.000 ni 24 meses cuando faltan datos
  assert.ok(!rootEl.innerHTML.includes('value="20"'), 'No debe inyectar tasa falsa de 20 %');
  assert.ok(!rootEl.innerHTML.includes('value="720000"'), 'No debe inyectar cuota falsa de $720.000');

  // Caso A: Enviar oferta con tasa ausente ('')
  domElements['final-amount'] = { value: '6000000' };
  domElements['final-rate'] = { value: '' };
  domElements['final-payment'] = { value: '250000' };
  domElements['final-term'] = { value: '24' };
  domElements['final-costs'] = { value: '' };
  domElements['final-costs-type'] = { value: 'unico' };
  domElements['final-unknown-checkbox'] = { checked: false };
  domElements['approx-amount'] = { checked: false };
  domElements['approx-rate'] = { checked: false };
  domElements['approx-payment'] = { checked: false };
  domElements['approx-term'] = { checked: false };

  globalThis.window.submitFinalOfferComparison('app_bbva_1');

  assert.ok(rootEl.innerHTML.includes('Dato pendiente'), 'Una tasa ausente debe mostrarse como "Dato pendiente"');
  assert.ok(rootEl.innerHTML.includes('Pendiente de datos'), 'No debe inventar coherencia matemática si falta la tasa');

  // Caso B: Informar tasa de 0 % -> guardar, comparar y recargar
  domElements['final-rate'] = { value: '0' };
  domElements['final-payment'] = { value: '250000' };
  domElements['final-term'] = { value: '24' };

  globalThis.window.submitFinalOfferComparison('app_bbva_1');

  assert.ok(rootEl.innerHTML.includes('0,0 % E.A.'), 'La tasa 0 % debe mostrarse como 0,0 % E.A. y no como 20 % ni Dato pendiente');
  assert.ok(!rootEl.innerHTML.includes('20,0 % E.A.'), 'No debe sustituir 0 % por 20 %');

  // Simular recarga leyendo directamente lo persistido en localStorage
  const reloadedState = StorageService.loadState();
  assert.strictEqual(reloadedState.temporaryOffer.tasaEA, 0, 'Tasa 0 % debe conservarse al recargar en temporaryOffer');
  assert.strictEqual(reloadedState.applications[0].finalOffer.tasaEA, 0, 'Tasa 0 % debe conservarse al recargar en la solicitud');
  assert.strictEqual(reloadedState.currentScreen, 'final_offer_comparison', 'Pantalla debe conservarse al recargar');
});

test('Criterio 3 — Compra parcial: pago posterior incluye nuevas + activas, cargos contados una sola vez y diferencias cuando baja cuota y sube total', () => {
  // 2 deudas: Bancolombia ($12M, $600k/m, 24m, 20% EA) + Davivienda ($10M, $500k/m, 24m, 20% EA)
  // Crédito parcial nuevo consolida solo Bancolombia a 60 meses con cuota baja ($280k) y cargo único de $300k
  // Davivienda continúa activa ($500k/m durante 24m => $12.000.000 en pagos futuros)
  const continuingDebt = {
    id: 'dav_1',
    entity: 'Banco Davivienda',
    entityName: 'Banco Davivienda',
    type: 'libre_inversion',
    balance: 10000000,
    monthlyPayment: 500000,
    rateEA: 20,
    knowsRate: true,
    isEstimated: false,
    rateSourceType: 'user_reported',
    termMonths: 24
  };
  const consolidatedOriginal = {
    id: 'ban_1',
    entity: 'Bancolombia',
    entityName: 'Bancolombia',
    type: 'tarjeta_credito',
    balance: 12000000,
    monthlyPayment: 650000,
    rateEA: 25,
    knowsRate: true,
    isEstimated: false,
    rateSourceType: 'user_reported',
    termMonths: 24
  };

  const currentSnapshot = calculateSnapshot([consolidatedOriginal, continuingDebt]);
  assert.strictEqual(currentSnapshot.initialJointPayment, 1150000);
  // 24*650k + 24*500k = 15.600.000 + 12.000.000 = 27.600.000
  assert.strictEqual(currentSnapshot.estimatedRemainingCost, 27600000);

  const scenario = calculateConsolidationScenarioSummary({
    newCredit: {
      monthlyPayment: 320000,
      termMonths: 60,
      oneTimeCharges: 300000, // contado UNA sola vez
      extraMonthlyCharge: 0
    },
    remainingDebts: [continuingDebt]
  });

  // Pago mensual posterior = $320.000 (nuevo) + $500.000 (continúa) = $820.000
  assert.strictEqual(scenario.initialJointMonthlyPayment, 820000);
  assert.strictEqual(scenario.remainingActiveMonthlyPayment, 500000);
  // Total futuro = (320.000 * 60 + 300.000) + (500.000 * 24) = 19.500.000 + 12.000.000 = 31.500.000
  assert.strictEqual(scenario.totalChargesCountedOnce, 300000);
  assert.strictEqual(scenario.scenarioTotalFuturePayment, 31500000);
  assert.strictEqual(scenario.scenarioLastPaymentMonth, 60);

  // Trade-off: baja cuota (-$330.000/mes) pero sube el total futuro (+$3.900.000) -> muestra ambas diferencias en pesos
  const tradeOff = calculateTradeOff(currentSnapshot, {
    pagoMensualTotalPosterior: scenario.initialJointMonthlyPayment,
    scenarioLastPaymentMonth: scenario.scenarioLastPaymentMonth,
    scenarioTotalFuturePayment: scenario.scenarioTotalFuturePayment
  });

  assert.strictEqual(tradeOff.cuotaDiff, -330000);
  assert.strictEqual(tradeOff.costoDiff, 3900000);
  assert.strictEqual(tradeOff.monthlyPaymentDropsAndTotalIncreases, true);
  assert.ok(tradeOff.whatYouGain.some(t => t.includes('330.000')), 'Debe mostrar reducción mensual en pesos');
  assert.ok(tradeOff.whatYouSacrifice.some(t => t.includes('3.900.000')), 'Debe mostrar aumento total futuro en pesos');

  // También verificar que calculateProductSimulation propague escenario completo parcial
  const bancolombiaProduct = REAL_PORTFOLIO_PRODUCTS.find(p => p.entityId === 'bancolombia');
  const elig = evaluatePortfolioEligibility(bancolombiaProduct, [consolidatedOriginal, continuingDebt]);
  const sim = calculateProductSimulation(bancolombiaProduct, elig, 60);
  assert.strictEqual(sim.pagoMensualTotalPosterior, sim.cuotaMin + 650000);
  assert.strictEqual(sim.scenarioTotalFuturePayment, (sim.cuotaMin * 60) + (650000 * 24));
});

test('Criterio 4 — Medición piloto: abrir 3 veces el mismo resultado cuenta 1 comparación por participante anónimo y separa demo', () => {
  localStorage.clear();

  // Simular eventos de demo primero: no deben contar como hitos de piloto
  AnalyticsProvider.trackFirstSummaryViewed({ isDemo: true, screen: 'snapshot' });
  AnalyticsProvider.trackFirstComparisonCompleted({ isDemo: true, screen: 'comparison' });

  let summary = AnalyticsProvider.getMetricsSummary();
  assert.strictEqual(summary.demoFirstSummaryViewedCount, 1);
  assert.strictEqual(summary.demoFirstComparisonCompletedCount, 1);
  assert.strictEqual(summary.firstSummaryViewedCount, 0, 'Demo no debe inflar resumen de piloto');
  assert.strictEqual(summary.firstComparisonCompletedCount, 0, 'Demo no debe inflar comparación de piloto');

  // Ahora participante anónimo real consulta el resumen 2 veces y abre comparación 3 veces
  AnalyticsProvider.trackFirstSummaryViewed({ isDemo: false, screen: 'snapshot' });
  AnalyticsProvider.trackFirstSummaryViewed({ isDemo: false, screen: 'snapshot' });

  AnalyticsProvider.trackFirstComparisonCompleted({ isDemo: false, screen: 'before_after' });
  AnalyticsProvider.trackFirstComparisonCompleted({ isDemo: false, screen: 'comparison' });
  AnalyticsProvider.trackFirstComparisonCompleted({ isDemo: false, screen: 'final_offer_comparison' });

  // Simular persistencia tras recarga leyendo resumen nuevamente
  summary = AnalyticsProvider.getMetricsSummary();
  assert.ok(summary.participantId && summary.participantId.startsWith('piloto_'));
  assert.strictEqual(summary.firstSummaryViewedCount, 1, 'Primera consulta del resumen se cuenta una sola vez');
  assert.strictEqual(summary.firstComparisonCompletedCount, 1, 'Primera comparación completada se cuenta una sola vez aunque abra 3 veces');
  assert.strictEqual(summary.storageScope, 'browser_local');
  assert.ok(summary.storageScopeLabel.includes('navegador') && summary.storageScopeLabel.includes('localStorage'));

  // Verificar que los eventos registrados de first_comparison_completed en piloto sean exactamente 1
  const pilotComparisonEvents = AnalyticsProvider.getEvents().filter(
    e => e.name === 'first_comparison_completed' && !e.payload?.isDemo
  );
  assert.strictEqual(pilotComparisonEvents.length, 1);
});
