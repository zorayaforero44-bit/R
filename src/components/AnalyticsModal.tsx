import React from 'react';
import { AnalyticsProvider } from '../services/analytics.js';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const summary = AnalyticsProvider.getMetricsSummary();
  const events = AnalyticsProvider.getEvents();

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="bg-[#0B2530] p-4 text-white flex justify-between items-center">
          <div>
            <h3 className="font-bold text-base">Métricas & Eventos de RelieFin</h3>
            <p className="text-xs text-slate-300">Monitoreo de conversión local y servicios en evaluación</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-xl font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 text-sm text-slate-700">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-100 p-2.5 rounded-xl">
              <span className="text-slate-400 block text-[10px]">Total Eventos</span>
              <span className="font-bold text-slate-800 text-base">{summary.totalEvents}</span>
            </div>
            <div className="bg-slate-100 p-2.5 rounded-xl">
              <span className="text-slate-400 block text-[10px]">Solicitudes iniciadas</span>
              <span className="font-bold text-slate-800 text-base">{summary.applicationsStarted}</span>
            </div>
            <div className="bg-teal-50 p-2.5 rounded-xl">
              <span className="text-teal-700 block text-[10px]">Tasa Resultado Conocido</span>
              <span className="font-bold text-teal-900 text-base">{summary.outcomeRate}</span>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-xl">
              <span className="text-amber-800 block text-[10px]">Interés en Premium</span>
              <span className="font-bold text-amber-900 text-base">
                {summary.personalizedPlanInterest + summary.premiumTrackingInterest}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">Desglose de eventos registrados</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {events.length === 0 ? (
                <p className="text-slate-400 text-center py-2">Sin eventos aún.</p>
              ) : (
                events
                  .slice()
                  .reverse()
                  .map((e, index) => (
                    <div key={index} className="py-1 border-b border-slate-100 last:border-0 flex justify-between items-center">
                      <span className="text-teal-700 font-semibold">{e.name}</span>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(e.timestamp).toLocaleTimeString('es-CO')}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
