import test from 'node:test';
import assert from 'node:assert';
import { RateProvider } from '../src/services/rates.js';
import { calculatePrecision } from '../src/services/precision.js';
import { calculateSnapshot, calculateTradeOff } from '../src/services/calculations.js';

test('CASO A: Tarjeta de crédito con entidad y tasa conocida (E.A. y M.V.)', () => {
  // A1: Tasa en E.A. conocida
  const resEA = RateProvider.resolveRate({
    entityId: 'bancolombia',
    entityName: 'Bancolombia',
    productType: 'tarjeta_credito',
    knowsRate: true,
    reportedRate: 25.4,
    ratePeriod: 'EA'
  });

  assert.strictEqual(resEA.rateSourceType, 'user_reported');
  assert.strictEqual(resEA.rateConfidence, 'alta');
  assert.strictEqual(resEA.isEstimated, false);
  assert.strictEqual(resEA.rateEA, 25.4);
  assert.ok(resEA.label.includes('Reportada por ti'));

  // A2: Tasa en M.V. convertida contractualmente a E.A.
  const resMV = RateProvider.resolveRate({
    entityId: 'davivienda',
    entityName: 'Banco Davivienda',
    productType: 'tarjeta_credito',
    knowsRate: true,
    reportedRate: 2.1, // 2.1% M.V. -> ((1+0.021)^12 - 1)*100 = 28.32% EA
    ratePeriod: 'MV'
  });

  assert.strictEqual(resMV.rateSourceType, 'user_reported');
  assert.strictEqual(resMV.isEstimated, false);
  assert.strictEqual(resMV.ratePeriod, 'MV');
  assert.strictEqual(resMV.reportedRate, 2.1);
  assert.ok(resMV.rateEA > 28.0 && resMV.rateEA < 28.5);
});

test('CASO B: Tarjeta de crédito con entidad conocida y tasa desconocida (Nivel 2)', () => {
  const res = RateProvider.resolveRate({
    entityId: 'bancolombia',
    entityName: 'Bancolombia',
    productType: 'tarjeta_credito',
    knowsRate: false,
    useReferenceConsent: true
  });

  assert.strictEqual(res.rateSourceType, 'entity_product_public');
  assert.strictEqual(res.isEstimated, true);
  assert.strictEqual(res.rateEA, 25.9);
  assert.strictEqual(res.referenceRate, 25.9);
  assert.ok(res.rateSourceUrl.includes('Superintendencia Financiera'));
  assert.ok(res.label.includes('Referencia pública'));
});

test('CASO C: Entidad que no aparece en el catálogo ("Otra entidad" -> Nivel 4)', () => {
  const res = RateProvider.resolveRate({
    entityId: 'otra',
    entityName: 'Cooperativa Mi Pueblo',
    productType: 'tarjeta_credito',
    knowsRate: false,
    useReferenceConsent: true
  });

  assert.strictEqual(res.rateSourceType, 'colombia_general_reference');
  assert.strictEqual(res.isEstimated, true);
  assert.strictEqual(res.rateConfidence, 'baja');
  assert.strictEqual(res.rateEA, 27.4); // Promedio ponderado Colombia
  assert.ok(res.label.includes('Estimación general'));
});

test('CASO D: Dos tarjetas de la misma entidad con tasas distintas', () => {
  // Tarjeta 1: Usuario conoce su tasa preferencial
  const card1 = RateProvider.resolveRate({
    entityId: 'bancolombia',
    entityName: 'Bancolombia',
    productType: 'tarjeta_credito',
    knowsRate: true,
    reportedRate: 22.0,
    ratePeriod: 'EA'
  });

  // Tarjeta 2: Usuario no conoce la tasa de su otra tarjeta (aplica referencia de catálogo)
  const card2 = RateProvider.resolveRate({
    entityId: 'bancolombia',
    entityName: 'Bancolombia',
    productType: 'tarjeta_credito',
    knowsRate: false,
    useReferenceConsent: true
  });

  assert.strictEqual(card1.rateEA, 22.0);
  assert.strictEqual(card1.isEstimated, false);
  assert.strictEqual(card2.rateEA, 25.9);
  assert.strictEqual(card2.isEstimated, true);
  assert.notStrictEqual(card1.rateEA, card2.rateEA);
});

test('CASO E: Producto sin tasa pública verificable (Nivel 5: "Referencia no disponible")', () => {
  const res = RateProvider.resolveRate({
    entityId: 'otra',
    entityName: 'Prestamista Particular',
    productType: 'otro',
    knowsRate: false,
    useReferenceConsent: true
  });

  assert.strictEqual(res.rateSourceType, 'none');
  assert.strictEqual(res.rateConfidence, 'sin_referencia');
  assert.strictEqual(res.rateEA, null);
  assert.strictEqual(res.referenceRate, null);
  assert.ok(res.label.includes('Referencia no disponible'));
});

test('CASO F: Registro de deuda sin plazo conocido', () => {
  const debtWithoutTerm = {
    id: 'f1',
    entityName: 'Banco Davivienda',
    balance: 5000000,
    monthlyPayment: 350000,
    rateEA: 26.2,
    termMonths: null,
    knowsRate: false,
    isEstimated: true
  };

  const snapshot = calculateSnapshot([debtWithoutTerm]);
  assert.strictEqual(snapshot.totalBalance, 5000000);
  assert.strictEqual(snapshot.totalMonthlyPayment, 350000);
  assert.ok(snapshot.estimatedTermMonths > 0);
  assert.strictEqual(snapshot.hasUncertainty, true);
});

test('CASO G: Comparación con mezcla de tasas reportadas y estimadas', () => {
  const debts = [
    {
      id: 'g1',
      entityName: 'Bancolombia',
      balance: 6000000,
      monthlyPayment: 400000,
      rateEA: 25.0,
      reportedRate: 25.0,
      rateSourceType: 'user_reported',
      knowsRate: true,
      isEstimated: false,
      termMonths: 24
    },
    {
      id: 'g2',
      entityName: 'Banco Davivienda',
      balance: 4000000,
      monthlyPayment: 250000,
      rateEA: 26.2,
      referenceRate: 26.2,
      rateSourceType: 'entity_product_public',
      knowsRate: false,
      isEstimated: true,
      termMonths: 18
    }
  ];

  const precision = calculatePrecision(debts);
  assert.strictEqual(precision.level, 'media');
  assert.strictEqual(precision.userReportedCount, 1);
  assert.strictEqual(precision.entityPublicCount, 1);

  const snapshot = calculateSnapshot(debts);
  assert.strictEqual(snapshot.hasUncertainty, true);
  assert.strictEqual(snapshot.totalBalance, 10000000);
  assert.strictEqual(snapshot.totalMonthlyPayment, 650000);

  const alt = {
    cuotaMensual: 520000,
    plazoMeses: 24,
    costoTotalEstimado: 12480000
  };

  const tradeOff = calculateTradeOff(snapshot, alt);
  assert.strictEqual(tradeOff.hasUncertainty, true);
  assert.ok(tradeOff.whatYouShouldReview.some(r => r.includes('Advertencia')), 'Debe advertir de incertidumbre');
  assert.ok(tradeOff.whatYouGain.some(g => g.includes('Reducción de cuota')), 'Debe distinguir reducción de cuota');
});
