import React from 'react';
import type { Application, DebtRestructuring } from '../../types.ts';
import { Icons } from '../Icons.tsx';

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
  applications: Application[];
  acceptedRestructuring: DebtRestructuring | null;
  onOpenOutcomeReport: (appId: string) => void;
  onOpenFinalOfferInput: (appId: string) => void;
  onStartAnalysis: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  applications,
  acceptedRestructuring,
  onOpenOutcomeReport,
  onOpenFinalOfferInput,
  onStartAnalysis
}) => {
  const lastApp = applications[0];

  return (
    <div className="p-5">
      {/* Adaptive banners based on user state */}
      {lastApp && (lastApp.status === 'en_estudio' || lastApp.status === 'iniciada') && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-5 flex items-start space-x-3 shadow-sm">
          <div className="text-teal-600 mt-0.5">{Icons.info}</div>
          <div className="flex-1">
            <p className="font-bold text-xs text-teal-900 uppercase tracking-wide">
              Solicitud en curso con {lastApp.entidad}
            </p>
            <p className="text-xs text-teal-800 mt-0.5">¿Ya recibiste respuesta de la entidad financiera?</p>
            <button
              onClick={() => onOpenOutcomeReport(lastApp.id)}
              className="mt-2 text-xs bg-teal-700 hover:bg-teal-800 text-white font-bold px-3 py-1.5 rounded-lg transition"
            >
              Actualizar resultado
            </button>
          </div>
        </div>
      )}

      {lastApp && lastApp.status === 'no_aprobada' && (
        <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 mb-5 flex items-start space-x-3 shadow-sm">
          <div className="text-slate-600 mt-0.5">{Icons.info}</div>
          <div className="flex-1">
            <p className="font-bold text-xs text-slate-800">Podemos revisar otras alternativas</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Tu solicitud con {lastApp.entidad} no fue aprobada. Hay otras opciones que coinciden con tu objetivo.
            </p>
            <button
              onClick={() => onNavigate('rejection_guidance')}
              className="mt-2 text-xs bg-[#0B2530] hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition"
            >
              Explorar opciones restantes
            </button>
          </div>
        </div>
      )}

      {lastApp && lastApp.status === 'aprobada' && !acceptedRestructuring && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5 flex items-start space-x-3 shadow-sm">
          <div className="text-emerald-600 mt-0.5">{Icons.check}</div>
          <div className="flex-1">
            <p className="font-bold text-xs text-emerald-900">¡Solicitud aprobada por {lastApp.entidad}!</p>
            <p className="text-xs text-emerald-800 mt-0.5">Revisemos las condiciones definitivas antes de que decidas aceptar.</p>
            <button
              onClick={() => onOpenFinalOfferInput(lastApp.id)}
              className="mt-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg transition"
            >
              Comparar oferta final
            </button>
          </div>
        </div>
      )}

      {acceptedRestructuring && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-5 flex items-start space-x-3 shadow-sm">
          <div className="text-teal-600 mt-0.5">{Icons.shield}</div>
          <div className="flex-1">
            <p className="font-bold text-xs text-teal-900">Consolidación en progreso</p>
            <p className="text-xs text-teal-800 mt-0.5">
              Llevas {acceptedRestructuring.pagosRealizados} pagos realizados de {acceptedRestructuring.plazoOriginalMeses}.
            </p>
            <button
              onClick={() => onNavigate('evolution')}
              className="mt-2 text-xs bg-teal-700 hover:bg-teal-800 text-white font-bold px-3 py-1.5 rounded-lg transition"
            >
              Ver mi evolución financiera
            </button>
          </div>
        </div>
      )}

      {/* Hero Principal */}
      <div className="text-center py-6">
        <div className="inline-flex items-center space-x-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold px-3 py-1 rounded-full mb-3">
          <span>Tu copiloto para reorganizar tus deudas</span>
        </div>

        <h1 className="text-3xl font-extrabold text-[#0B2530] tracking-tight leading-tight">
          Muchas deudas.<br />
          <span className="text-teal-700">Un camino más claro.</span>
        </h1>

        <p className="text-sm text-slate-600 mt-3 max-w-sm mx-auto leading-relaxed">
          Organiza tus deudas, define qué quieres lograr y compara alternativas financieras según tus prioridades.
        </p>

        {/* CTA Principal del Diagnóstico Gratuito */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onStartAnalysis}
            className="w-full sm:w-auto bg-[#0B2530] hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
          >
            <span>Analizar mis deudas</span>
            <span>{Icons.arrowRight}</span>
          </button>

          <button
            onClick={() => onNavigate('how_it_works')}
            className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3.5 px-5 rounded-xl border border-slate-300 transition"
          >
            ¿Cómo funciona?
          </button>
        </div>

        <p className="text-[11px] text-slate-500 mt-3">
          Comparar alternativas no significa adquirir un nuevo crédito. Tú decides si quieres continuar.
        </p>
      </div>

      {/* Sección Investigación Comercial / Premium */}
      <div className="mt-6 bg-gradient-to-br from-slate-900 to-[#0B2530] text-white rounded-2xl p-5 shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-teal-500/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="flex items-center space-x-2 text-teal-300 text-xs font-bold uppercase tracking-wider mb-1">
          <span>{Icons.sparkles}</span>
          <span>Investigación comercial</span>
        </div>
        <h3 className="text-base font-bold text-white tracking-tight">
          Organiza tus finanzas a tu manera
        </h3>
        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
          Comienza con tu diagnóstico gratuito y descubre herramientas avanzadas para planificar y hacer seguimiento a tus pagos.
        </p>
        <button
          onClick={() => onNavigate('premium')}
          className="mt-4 w-full bg-teal-500 hover:bg-teal-400 text-[#0B2530] font-extrabold text-xs py-2.5 px-4 rounded-xl transition shadow flex items-center justify-center space-x-2"
        >
          <span>Conocer RelieFin Premium</span>
          <span>{Icons.arrowRight}</span>
        </button>
      </div>

      {/* Resumen de 4 pilares */}
      <div className="mt-8 grid grid-cols-2 gap-3 text-left">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs mb-2">1</div>
          <h4 className="font-bold text-xs text-slate-900">Entiende tu deuda</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Todas tus tarjetas y créditos en un solo lugar.</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs mb-2">2</div>
          <h4 className="font-bold text-xs text-slate-900">Elige tu objetivo</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Pagar más rápido, bajar cuota o mantener plazo.</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs mb-2">3</div>
          <h4 className="font-bold text-xs text-slate-900">Compara trade-offs</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Entiende lo que ganas y sacrificas con cada camino.</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs mb-2">4</div>
          <h4 className="font-bold text-xs text-slate-900">Sin presiones</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Tú tienes el control absoluto en todo momento.</p>
        </div>
      </div>
    </div>
  );
};
