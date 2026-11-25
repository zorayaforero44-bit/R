import test from 'node:test';
import assert from 'node:assert';
import { 
  calculateSnapshot, 
  calculateTradeOff, 
  simulateAdditionalPayment,
  generatePrioritizationScenarios,
  generatePaymentCalendar,
  formatCOP,
  convertEAToMV,
  convertMVToEA,
  calculateAmortizationMonthlyPayment,
  calculateCreditBreakdown
} from '../src/services/calculations.js';

test('Calculations: Coherencia matemática de la radiografía (Snapshot)', () => {
  const debts = [
    { id: '1', entity: 'Banco A', balance: 10000000, monthlyPayment: 600000, rateEA: 26.0, knowsRate: true, termMonths: 24 },
    { id: '2', entity: 'Banco B', balance: 5000000, monthlyPayment: 300000, rateEA: 20.0, knowsRate: true, termMonths: 24 }
  ];

  const snapshot = calculateSnapshot(debts);
  assert.strictEqual(snapshot.totalBalance, 15000000);
  assert.strictEqual(snapshot.totalMonthlyPayment, 900000);
  assert.strictEqual(snapshot.totalCount, 2);
  assert.strictEqual(snapshot.knownRatesCount, 2);
  assert.strictEqual(snapshot.estimatedRatesCount, 0);
  assert.strictEqual(formatCOP(15000000), '$ 15.000.000');
});

test('Calculations: Trade-off Antes vs Después', () => {
  const snapshot = {
    totalBalance: 15000000,
    totalMonthlyPayment: 900000,
    estimatedTermMonths: 24,
    estimatedRemainingCost: 19500000
  };

  const alt = {
    cuotaMensual: 650000,
    plazoMeses: 36,
    costoTotalEstimado: 23400000
  };

  const tradeOff = calculateTradeOff(snapshot, alt);
  assert.strictEqual(tradeOff.cuotaDiff, -250000); // Disminuye 250.000
  assert.strictEqual(tradeOff.plazoDiff, 12);     // Aumenta 12 meses
  assert.ok(tradeOff.whatYouGain.length > 0);
  assert.ok(tradeOff.whatYouSacrifice.length > 0);
  assert.ok(tradeOff.whatYouShouldReview.length > 0);
});

test('Calculations: Simulador de pago adicional ahorra meses e intereses', () => {
  const result = simulateAdditionalPayment(10000000, 500000, 26.0, 200000);
  assert.ok(result.monthsSaved > 0, 'Debe ahorrar meses');
  assert.ok(result.interestSaved > 0, 'Debe ahorrar intereses');
  assert.ok(result.newMonths < result.baseMonths, 'El nuevo plazo debe ser menor');
});

test('Calculations: Genera escenarios orientativos de priorización (Personalized Plan)', () => {
  const debts = [
    { id: '1', entity: 'Tarjeta A', balance: 3000000, monthlyPayment: 350000, rateEA: 28.0 },
    { id: '2', entity: 'Crédito B', balance: 10000000, monthlyPayment: 400000, rateEA: 22.0 },
    { id: '3', entity: 'Tarjeta C', balance: 1500000, monthlyPayment: 150000, rateEA: 26.0 }
  ];

  const scenarios = generatePrioritizationScenarios(debts, 150000);
  assert.strictEqual(scenarios.length, 3);
  
  // Bola de nieve debe tener primero a Tarjeta C (menor saldo: 1.5M)
  const snowball = scenarios.find(s => s.id === 'snowball');
  assert.strictEqual(snowball.firstFocus, 'Tarjeta C');

  // Avalancha debe tener primero a Tarjeta A (mayor tasa: 28%)
  const avalanche = scenarios.find(s => s.id === 'avalanche');
  assert.strictEqual(avalanche.firstFocus, 'Tarjeta A');

  // Flujo debe tener primero a Crédito B (mayor cuota: 400k)
  const cashflow = scenarios.find(s => s.id === 'cashflow');
  assert.strictEqual(cashflow.firstFocus, 'Crédito B');
});

test('Calculations: Calendario de pagos mensual', () => {
  const debts = [
    { id: '1', entity: 'Tarjeta A', paymentDay: 20, monthlyPayment: 350000 },
    { id: '2', entity: 'Crédito B', paymentDay: 5, monthlyPayment: 400000 }
  ];
  const calendar = generatePaymentCalendar(debts);
  assert.strictEqual(calendar[0].paymentDay, 5);
  assert.strictEqual(calendar[1].paymentDay, 20);
});

// =========================================================================
// NUEVAS PRUEBAS OBLIGATORIAS V3.1 — AUDITORÍA Y ESTABILIZACIÓN FINANCIERA
// =========================================================================

test('V3.1: Conversión E.A. a M.V. y viceversa', () => {
  // 20.4% EA -> MV: (1 + 0.204)^(1/12) - 1 = 1.5591% MV
  const mv = convertEAToMV(20.4);
  assert.ok(mv > 1.55 && mv < 1.57, `MV debe ser ~1.5591%, obtenido: ${mv}`);

  // Reversión de MV a EA
  const ea = convertMVToEA(mv);
  assert.ok(Math.abs(ea - 20.4) < 0.05, `EA reconvertida debe ser ~20.4%, obtenido: ${ea}`);

  // Tasa cero
  assert.strictEqual(convertEAToMV(0), 0);
  assert.strictEqual(convertMVToEA(0), 0);
});

test('V3.1: Crédito de tasa cero', () => {
  const cuota = calculateAmortizationMonthlyPayment(12000000, 0, 12);
  assert.strictEqual(cuota, 1000000, 'A tasa cero la cuota debe ser capital / meses exacto');

  const breakdown = calculateCreditBreakdown(12000000, 0, 12);
  assert.strictEqual(breakdown.isCalculable, true);
  assert.strictEqual(breakdown.monthlyPayment, 1000000);
  assert.strictEqual(breakdown.totalCost, 12000000);
  assert.strictEqual(breakdown.totalInterest, 0);
});

test('V3.1: Cuota de amortización fija y coherencia total', () => {
  const capital = 10000000;
  const tasaEA = 24.0;
  const meses = 12;

  const cuota = calculateAmortizationMonthlyPayment(capital, tasaEA, meses);
  // Valor teórico exacto de cuota: 934.525 COP (fórmula nivelada estándar)
  assert.ok(Math.abs(cuota - 934525) <= 5, `Cuota nivelada debe ser ~934.525, obtenida: ${cuota}`);

  const breakdown = calculateCreditBreakdown(capital, tasaEA, meses);
  assert.strictEqual(breakdown.isCalculable, true);
  assert.strictEqual(breakdown.monthlyPayment, cuota);
  assert.strictEqual(breakdown.totalCost, cuota * meses);
  assert.strictEqual(breakdown.totalInterest, (cuota * meses) - capital);
  assert.ok(breakdown.totalInterest > 0, 'Debe haber intereses calculados mayores a 0');
});

test('V3.1: Manejo de datos incompletos', () => {
  assert.strictEqual(calculateAmortizationMonthlyPayment(null, 20.4, 24), null);
  assert.strictEqual(calculateAmortizationMonthlyPayment(10000000, null, 24), null);
  assert.strictEqual(calculateAmortizationMonthlyPayment(10000000, 20.4, null), null);
  assert.strictEqual(calculateAmortizationMonthlyPayment(10000000, 20.4, 0), null);

  const breakdown = calculateCreditBreakdown(null, 20.4, 24);
  assert.strictEqual(breakdown.isCalculable, false);
  assert.ok(breakdown.reason.includes('No es posible calcularlo'));
});

test('V3.1: Manejo de tasas inválidas', () => {
  assert.strictEqual(convertEAToMV(-10), null);
  assert.strictEqual(convertMVToEA(-10), null);
  assert.strictEqual(calculateAmortizationMonthlyPayment(10000000, -5, 12), null);
  assert.strictEqual(calculateAmortizationMonthlyPayment(10000000, NaN, 12), null);
});

test('V3.1: Escenario específico corregido ($26.700.000 al 20,4% E.A. durante 27 meses)', () => {
  const capital = 26700000;
  const tasaEA = 20.4;
  const meses = 27;

  const cuota = calculateAmortizationMonthlyPayment(capital, tasaEA, meses);
  const costoTotal = cuota * meses;
  const intereses = costoTotal - capital;

  // Verificación matemática estándar:
  // Tasa mensual = (1.204)^(1/12) - 1 = 1.56209%
  // Cuota teórica = 1.218.032 COP (aprox 1.218.000 COP)
  assert.ok(cuota >= 1215000 && cuota <= 1225000, `Cuota debe ser ~1.218.032, obtenida: ${cuota}`);
  assert.notStrictEqual(cuota, 2646000, 'ERROR CORREGIDO: La cuota NO debe ser 2.646.000');

  // Costo total = 1.218.032 * 27 = 32.886.864 COP
  assert.ok(costoTotal >= 32800000 && costoTotal <= 33000000, `Costo total debe ser ~32.886.864, obtenido: ${costoTotal}`);
  assert.notStrictEqual(costoTotal, 71442000, 'ERROR CORREGIDO: El costo total NO debe ser 71.442.000');

  // Intereses = 6.186.864 COP
  assert.ok(intereses >= 6100000 && intereses <= 6300000, `Intereses deben ser ~6.186.864, obtenidos: ${intereses}`);

  // Desglose del crédito
  const breakdown = calculateCreditBreakdown(capital, tasaEA, meses, 2646000);
  assert.strictEqual(breakdown.isCalculable, true);
  assert.strictEqual(breakdown.isPaymentDiscrepant, true, 'Debe detectar discrepancia si el usuario paga 2.646.000');
  assert.ok(breakdown.discrepancyReason.includes('seguros') || breakdown.discrepancyReason.includes('superior'));
});
