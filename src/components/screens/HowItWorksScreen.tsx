import React from 'react';
import { Icons } from '../Icons.tsx';

interface HowItWorksScreenProps {
  onNavigate: (screen: string) => void;
}

export const HowItWorksScreen: React.FC<HowItWorksScreenProps> = ({ onNavigate }) => {
  return (
    <div className="p-5">
      <button
        onClick={() => onNavigate('home')}
        className="text-xs text-slate-500 hover:text-[#0B2530] flex items-center space-x-1 mb-4"
      >
        <span>{Icons.arrowLeft}</span>
        <span>Volver a inicio</span>
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-[#0B2530]">¿Cómo funciona RelieFin?</h2>
        <p className="text-xs text-slate-600 mt-1">Un recorrido transparente de cuatro pasos diseñado para darte claridad.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex space-x-3.5 items-start">
          <div className="w-8 h-8 rounded-full bg-[#0B2530] text-teal-400 flex items-center justify-center font-extrabold text-sm shrink-0">
            1
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">1. Organiza</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Agrega tus tarjetas y otras obligaciones. No necesitas conocer la tasa exacta para comenzar; nosotros te ayudamos con referencias del mercado colombiano.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex space-x-3.5 items-start">
          <div className="w-8 h-8 rounded-full bg-[#0B2530] text-teal-400 flex items-center justify-center font-extrabold text-sm shrink-0">
            2
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">2. Define</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Cuéntanos qué quieres lograr: ¿pagar menos al mes?, ¿salir de deudas más rápido?, ¿o buscar mejores condiciones sin extender el plazo?
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex space-x-3.5 items-start">
          <div className="w-8 h-8 rounded-full bg-[#0B2530] text-teal-400 flex items-center justify-center font-extrabold text-sm shrink-0">
            3
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">3. Compara</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Revisa diferentes alternativas y sus consecuencias. No solo comparamos tasas; analizamos el impacto real en tu cuota, plazo y costo total.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex space-x-3.5 items-start">
          <div className="w-8 h-8 rounded-full bg-[#0B2530] text-teal-400 flex items-center justify-center font-extrabold text-sm shrink-0">
            4
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">4. Decide</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Tú decides si alguna alternativa tiene sentido para ti. Si te interesa, simulamos la solicitud con la entidad y te acompañamos a evaluar su respuesta.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-teal-50 border border-teal-200 rounded-xl p-4 text-xs text-teal-900 leading-relaxed text-center">
        <p className="font-bold">Principio central de RelieFin:</p>
        <p className="mt-1">RelieFin no presta dinero directamente. Te ayuda a entender, comparar y reorganizar las deudas que ya tienes.</p>
      </div>

      <div className="mt-6">
        <button
          onClick={() => onNavigate('debt_intake')}
          className="w-full bg-[#0B2530] hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition shadow"
        >
          Comenzar mi análisis
        </button>
      </div>
    </div>
  );
};
