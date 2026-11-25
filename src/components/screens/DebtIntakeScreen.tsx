import React, { useState } from 'react';
import type { Debt, DebtType } from '../../types.ts';
import { RateProvider } from '../../services/rates.js';
import { formatCOP, formatPercent } from '../../services/calculations.js';
import { AnalyticsProvider } from '../../services/analytics.js';
import { Icons } from '../Icons.tsx';

interface DebtIntakeScreenProps {
  debts: Debt[];
  onAddDebt: (debt: Debt) => void;
  onRemoveDebt: (id: string) => void;
  onLoadDemoDebts: () => void;
  onGoToSnapshot: () => void;
}

export const DebtIntakeScreen: React.FC<DebtIntakeScreenProps> = ({
  debts,
  onAddDebt,
  onRemoveDebt,
  onLoadDemoDebts,
  onGoToSnapshot
}) => {
  const [debtType, setDebtType] = useState<DebtType>('tarjeta_credito');
  const [entity, setEntity] = useState<string>('Entidad A');
  const [balance, setBalance] = useState<string>('');
  const [payment, setPayment] = useState<string>('');
  const [unknownRate, setUnknownRate] = useState<boolean>(false);
  const [rate, setRate] = useState<string>('');
  const [term, setTerm] = useState<string>('');
  const [paymentDay, setPaymentDay] = useState<string>('15');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleUnknownRate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setUnknownRate(isChecked);
    if (isChecked) {
      setRate('');
      AnalyticsProvider.track('unknown_rate_selected');
    }
  };

  const handleSaveDebt = () => {
    setErrorMessage(null);
    const numBalance = Number(balance);
    const numPayment = Number(payment);
    const numRate = Number(rate);
    const numTerm = term ? Number(term) : null;
    const numDay = Number(paymentDay) || 15;

    if (!numBalance || numBalance <= 0) {
      setErrorMessage('Por favor ingresa un saldo pendiente válido mayor a 0.');
      return;
    }
    if (!numPayment || numPayment <= 0) {
      setErrorMessage('Por favor ingresa un pago mensual aproximado válido mayor a 0.');
      return;
    }

    const rateMeta = RateProvider.resolveRate(debtType, numRate, !unknownRate);

    const newDebt: Debt = {
      id: 'debt_' + Date.now(),
      entityId: entity.toLowerCase().replace(/\s+/g, '_'),
      entityName: entity,
      productType: debtType,
      type: debtType,
      entity: entity,
      balance: numBalance,
      monthlyPayment: numPayment,
      rateEA: rateMeta.rateEA,
      reportedRate: !unknownRate && numRate > 0 ? numRate : null,
      ratePeriod: 'EA',
      referenceRate: rateMeta.rateEA,
      referenceRateMin: null,
      referenceRateMax: null,
      rateSourceType: !unknownRate && numRate > 0 ? 'user_reported' : 'colombia_general_reference',
      rateSourceUrl: null,
      rateSourceDate: null,
      rateLastVerified: null,
      rateConfidence: !unknownRate && numRate > 0 ? 'alta' : 'media',
      isEstimated: unknownRate || !numRate,
      knowsRate: !unknownRate && numRate > 0,
      termMonths: numTerm,
      paymentDay: numDay
    };

    onAddDebt(newDebt);
    AnalyticsProvider.track('added_debt', { type: debtType, balance: numBalance });

    // Reset inputs
    setBalance('');
    setPayment('');
    setRate('');
    setTerm('');
    setUnknownRate(false);
  };

  const typeLabels: Record<string, string> = {
    tarjeta_credito: 'Tarjeta de crédito',
    credito_consumo: 'Crédito de consumo',
    libre_inversion: 'Libre inversión',
    credito_fintech: 'Crédito fintech',
    otro: 'Otra obligación'
  };

  return (
    <div className="p-5">
      <div className="mb-5">
        <h2 className="text-2xl font-extrabold text-[#0B2530]">Construyamos tu radiografía financiera</h2>
        <p className="text-xs text-slate-600 mt-1">
          Agrega las obligaciones que quieres analizar. No necesitas conocer todos los datos para comenzar.
        </p>
      </div>

      {/* Botón de carga rápida para demostración */}
      <div className="mb-5 flex justify-between items-center bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-xs">
        <span className="text-slate-600 font-medium">¿Quieres probar rápido?</span>
        <button
          onClick={onLoadDemoDebts}
          className="bg-white hover:bg-slate-50 text-[#0B2530] font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition shadow-sm cursor-pointer"
        >
          Cargar 3 deudas de ejemplo
        </button>
      </div>

      {/* Lista de obligaciones agregadas */}
      <div className="space-y-3 mb-6">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
          Tus obligaciones ({debts.length})
        </h3>

        {debts.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
            <p className="text-xs">No has agregado ninguna deuda todavía.</p>
            <p className="text-[11px] text-slate-400 mt-1">Usa el formulario a continuación para registrar la primera.</p>
          </div>
        ) : (
          debts.map((d) => {
            const typeName = typeLabels[d.productType || d.type || 'otro'] || d.productType;
            const entityName = d.entity || d.entityName || 'Obligación';

            return (
              <div
                key={d.id}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-[#0B2530]">{entityName}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                      {typeName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 space-x-3">
                    <span>
                      Saldo: <strong className="text-slate-900">{formatCOP(d.balance)}</strong>
                    </span>
                    <span>
                      Cuota: <strong className="text-slate-900">{formatCOP(d.monthlyPayment)}</strong>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {d.knowsRate && d.rateEA ? (
                      <span className="text-teal-700 font-semibold">
                        ✓ Tasa: {formatPercent(d.rateEA)} (proporcionada)
                      </span>
                    ) : (
                      <span className="text-amber-700">
                        Tasa est.: {formatPercent(d.rateEA || 27.4)} (referencia)
                      </span>
                    )}
                    {d.termMonths ? ` · ${d.termMonths} meses` : ''}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onRemoveDebt(d.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 transition cursor-pointer"
                    title="Eliminar obligación"
                  >
                    {Icons.trash}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Formulario para agregar una obligación */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
        <h4 className="font-bold text-sm text-[#0B2530] mb-3 flex items-center space-x-1.5">
          <span>{Icons.plus}</span>
          <span>Agregar una obligación</span>
        </h4>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-lg mb-3">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipo de deuda</label>
            <select
              value={debtType}
              onChange={(e) => setDebtType(e.target.value as DebtType)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="tarjeta_credito">Tarjeta de crédito</option>
              <option value="credito_consumo">Crédito de consumo</option>
              <option value="libre_inversion">Crédito de libre inversión</option>
              <option value="credito_fintech">Crédito fintech</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Entidad financiera</label>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Bancolombia">Bancolombia</option>
              <option value="Banco Davivienda">Banco Davivienda</option>
              <option value="Banco de Bogotá">Banco de Bogotá</option>
              <option value="Entidad A">Entidad A</option>
              <option value="Entidad B">Entidad B</option>
              <option value="Entidad C">Entidad C</option>
              <option value="Otra entidad">Otra entidad</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Saldo pendiente (COP) *</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="Ej: 5000000"
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pago mensual aprox. (COP) *</label>
              <input
                type="number"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                placeholder="Ej: 350000"
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Tasa EA con opción "No conozco mi tasa" */}
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">Tasa de interés E.A. (opcional)</label>
              <label className="flex items-center space-x-1 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unknownRate}
                  onChange={handleToggleUnknownRate}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>No conozco mi tasa</span>
              </label>
            </div>
            <input
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              disabled={unknownRate}
              placeholder="Ej: 27.4 (% E.A.)"
              className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100 disabled:text-slate-400"
            />
            {unknownRate && (
              <p className="text-[11px] text-teal-700 mt-1">
                💡 Usaremos una tasa estimada de referencia del mercado colombiano para el análisis inicial.
              </p>
            )}
          </div>

          {/* Plazo y día de pago */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plazo restante (meses, opcional)</label>
              <input
                type="number"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Ej: 24 (o vacío)"
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Día de pago del mes (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={paymentDay}
                onChange={(e) => setPaymentDay(e.target.value)}
                placeholder="Ej: 15"
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <button
            onClick={handleSaveDebt}
            className="w-full mt-2 bg-teal-700 hover:bg-teal-800 text-white font-bold py-2.5 rounded-xl transition shadow-sm cursor-pointer"
          >
            + Agregar esta obligación
          </button>
        </div>
      </div>

      {/* CTA para avanzar */}
      <button
        onClick={onGoToSnapshot}
        disabled={debts.length === 0}
        className={`w-full font-bold py-3.5 px-6 rounded-xl transition ${
          debts.length > 0
            ? 'bg-[#0B2530] hover:bg-slate-800 text-white shadow-lg cursor-pointer'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        Ver mi situación ({debts.length} obligaciones)
      </button>
    </div>
  );
};
