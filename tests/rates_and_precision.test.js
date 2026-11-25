import test from 'node:test';
import assert from 'node:assert';
import { RateProvider } from '../src/services/rates.js';
import { calculatePrecision } from '../src/services/precision.js';

test('RateProvider: maneja tasas conocidas y desconocidas', () => {
  // Caso A: Tasa conocida
  const userRate = RateProvider.resolveRate('tarjeta_credito', 25.5, true);
  assert.strictEqual(userRate.source, 'user');
  assert.strictEqual(userRate.rateEA, 25.5);
  assert.ok(userRate.label.includes('Reportada por ti') || userRate.label.includes('proporcionada'));

  // Caso B: Tasa desconocida
  const refRate = RateProvider.resolveRate('tarjeta_credito', null, false);
  assert.strictEqual(refRate.source, 'reference');
  assert.strictEqual(refRate.rateEA, 27.4);
  assert.ok(refRate.label.includes('referencia') || refRate.label.includes('general'));
});

test('calculatePrecision: evalúa los 3 niveles de precisión requeridos', () => {
  // Caso 1: Todas conocidas -> Alta
  const debtsAllKnown = [
    { balance: 5000000, monthlyPayment: 300000, rateEA: 26.5, knowsRate: true, termMonths: 18, rateSourceType: 'user_reported' },
    { balance: 3000000, monthlyPayment: 200000, rateEA: 24.0, knowsRate: true, termMonths: 12, rateSourceType: 'user_reported' }
  ];
  const p1 = calculatePrecision(debtsAllKnown);
  assert.strictEqual(p1.level, 'alta');
  assert.ok(p1.percentage >= 90);

  // Caso 2: Mixtas -> Media
  const debtsMixed = [
    { balance: 5000000, monthlyPayment: 300000, rateEA: 26.5, knowsRate: true, termMonths: 18, rateSourceType: 'user_reported' },
    { balance: 3000000, monthlyPayment: 200000, rateEA: 27.4, knowsRate: false, termMonths: 12, rateSourceType: 'colombia_general_reference' }
  ];
  const p2 = calculatePrecision(debtsMixed);
  assert.strictEqual(p2.level, 'media');
  assert.ok(p2.explanation.includes('estimamos las tasas de 1 de tus 2 obligaciones'));

  // Caso 3: Ninguna conocida -> Estimación inicial
  const debtsUnknown = [
    { balance: 5000000, monthlyPayment: 300000, rateEA: 27.4, knowsRate: false, rateSourceType: 'colombia_general_reference' },
    { balance: 3000000, monthlyPayment: 200000, rateEA: 22.5, knowsRate: false, rateSourceType: 'colombia_general_reference' }
  ];
  const p3 = calculatePrecision(debtsUnknown);
  assert.strictEqual(p3.level, 'estimacion_inicial');
  assert.ok(p3.percentage <= 40);
});
