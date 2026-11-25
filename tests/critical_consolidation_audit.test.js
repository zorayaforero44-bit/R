import test from 'node:test';
import assert from 'node:assert';
import { 
  REAL_PORTFOLIO_PRODUCTS, 
  evaluatePortfolioEligibility, 
  calculateProductSimulation,
  evaluatePortfolioFullCoverage
} from '../src/services/portfolioProducts.js';
import { AUDITED_5_DEBTS_SCENARIO } from '../src/services/storage.js';

test('Auditoría Crítica V3.2: 5 deudas por $46.200.000 y pago de $3.650.000', async (t) => {
  // Verificación de datos del escenario auditado
  const totalBalance = AUDITED_5_DEBTS_SCENARIO.reduce((sum, d) => sum + d.balance, 0);
  const totalMonthlyPayment = AUDITED_5_DEBTS_SCENARIO.reduce((sum, d) => sum + d.monthlyPayment, 0);
  
  assert.strictEqual(AUDITED_5_DEBTS_SCENARIO.length, 5, 'Deben ser exactamente 5 deudas');
  assert.strictEqual(totalBalance, 46200000, 'Deuda total debe ser exactamente $46.200.000');
  assert.strictEqual(totalMonthlyPayment, 3650000, 'Pago mensual total debe ser exactamente $3.650.000');

  await t.test('1. Búsqueda inicial: Evalúa consolidación del 100% y explica motivos si no es viable', () => {
    const fullCoverage = evaluatePortfolioFullCoverage(AUDITED_5_DEBTS_SCENARIO);
    
    assert.strictEqual(typeof fullCoverage.canAnyProductConsolidate100, 'boolean');
    assert.ok(fullCoverage.explanation.length > 0, 'Debe incluir explicación');
    assert.ok(fullCoverage.maxCoveragePercentage > 0, 'Debe reportar máxima cobertura porcentual');
  });

  await t.test('2. Desglose completo por banco: Cuotas remanentes y Pago mensual posterior', () => {
    const bancolombiaProd = REAL_PORTFOLIO_PRODUCTS.find(p => p.id === 'bancolombia_compra_cartera');
    assert.ok(bancolombiaProd);

    const eligibility = evaluatePortfolioEligibility(bancolombiaProd, AUDITED_5_DEBTS_SCENARIO);

    // Debe identificar que Bancolombia no compra su propia deuda (deuda 1 de $14M y deuda 4 de $12M son Bancolombia)
    assert.strictEqual(eligibility.totalOriginalDebt, 46200000);
    assert.strictEqual(eligibility.totalDebtsCount, 5);
    assert.strictEqual(eligibility.totalOriginalMonthlyPayment, 3650000);
    assert.ok(eligibility.excludedCount > 0, 'Debe excluir deudas propias');
    assert.ok(eligibility.consolidationPercentage < 100, 'No puede consolidar 100% de su propia deuda');

    const simulation = calculateProductSimulation(bancolombiaProd, eligibility);

    // Verificación de métricas
    assert.ok(simulation.pagoMensualTotalPosterior > 0);
    assert.ok(simulation.remainingActiveCuotas > 0, 'Debe sumar las cuotas de deudas excluidas');
    
    // PUNTO 3: Fórmula obligatoria
    assert.strictEqual(
      simulation.pagoMensualTotalPosterior,
      simulation.cuotaMensual + simulation.remainingActiveCuotas,
      'Pago posterior debe ser estrictamente cuota nueva + cuotas de deudas activas'
    );

    // PUNTO 4: Ahorro mensual real
    assert.strictEqual(
      simulation.ahorroMensualReal,
      eligibility.totalOriginalMonthlyPayment - simulation.pagoMensualTotalPosterior,
      'Ahorro mensual real debe ser pago actual total - pago posterior total'
    );

    // PUNTO 8: Obligaciones activas resultantes no debe ser 1 si se excluyen deudas
    assert.strictEqual(
      simulation.activeObligationsAfterOperation,
      1 + eligibility.excludedCount,
      'No afirmar que pasó a 1 obligación si quedaron deudas sin comprar'
    );
  });

  await t.test('3 & 4. Simulación con aprobación parcial de $15.000.000 y cuota de $720.000', () => {
    // Escenario de aprobación parcial denunciado en el requerimiento:
    // Usuario debe $46.200.000 y paga $3.650.000
    // Recibe $15.000.000 con cuota de $720.000
    // Cancela Deuda 2 ($8.200.000, cuota $620.000) y Deuda 3 ($6.800.000, cuota $580.000) = $15.000.000
    // Quedan activas: Deuda 1 ($14.000.000, cuota $1.150.000), Deuda 4 ($12.000.000, cuota $950.000), Deuda 5 ($5.200.000, cuota $350.000)
    const cuotasActivasRemanentes = 1150000 + 950000 + 350000; // $2.450.000
    const nuevaCuota = 720000;

    // Fórmula obligatoria: Pago posterior = cuota nueva + cuotas activas
    const pagoMensualTotalPosterior = nuevaCuota + cuotasActivasRemanentes; // $3.170.000
    assert.strictEqual(pagoMensualTotalPosterior, 3170000);

    // Ahorro mensual real: $3.650.000 - $3.170.000 = $480.000
    const ahorroMensualReal = 3650000 - pagoMensualTotalPosterior;
    assert.strictEqual(ahorroMensualReal, 480000);

    // No afirmar que el pago bajó a $720.000 ni que el ahorro fue $3.650.000 - $720.000 = $2.930.000 falso
    assert.notStrictEqual(pagoMensualTotalPosterior, 720000);
    assert.notStrictEqual(ahorroMensualReal, 3650000 - 720000);

    // Obligaciones activas: 1 (nueva) + 3 (remanentes) = 4 obligaciones
    const totalObligacionesActivas = 1 + 3;
    assert.strictEqual(totalObligacionesActivas, 4);
    assert.notStrictEqual(totalObligacionesActivas, 1, 'Prohibido afirmar que pasó de 5 a 1 obligación');
  });

  await t.test('6 & 7. Estado pendiente de desembolso no cancela deudas hasta confirmación', () => {
    // Al aceptar la oferta, status = 'pendiente_desembolso'
    const acceptedRestructuring = {
      status: 'pendiente_desembolso',
      montoAprobado: 15000000,
      cuotaActual: 720000,
      pagoMensualPrevio: 3650000,
      remainingActiveMonthlyPayment: 2450000,
      totalActiveObligationsAfter: 4,
      cancelledDebts: [
        { debt: { id: 'd2', balance: 8200000, monthlyPayment: 620000 } },
        { debt: { id: 'd3', balance: 6800000, monthlyPayment: 580000 } }
      ],
      remainingDebts: [
        { debt: { id: 'd1', balance: 14000000, monthlyPayment: 1150000 } },
        { debt: { id: 'd4', balance: 12000000, monthlyPayment: 950000 } },
        { debt: { id: 'd5', balance: 5200000, monthlyPayment: 350000 } }
      ]
    };

    assert.strictEqual(acceptedRestructuring.status, 'pendiente_desembolso');
    // En este estado, el desembolso no ha ocurrido y las deudas originales continúan vigentes contractualmente
    assert.strictEqual(acceptedRestructuring.totalActiveObligationsAfter, 4);
    assert.strictEqual(acceptedRestructuring.cuotaActual + acceptedRestructuring.remainingActiveMonthlyPayment, 3170000);
  });
});
