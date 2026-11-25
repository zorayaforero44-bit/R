import React from 'react';

interface NavbarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  applicationsCount: number;
  hasRestructuring: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  applicationsCount,
  hasRestructuring
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div 
        className="flex items-center space-x-2 cursor-pointer select-none" 
        onClick={() => onNavigate('home')}
      >
        <div className="w-8 h-8 rounded-lg bg-[#0B2530] flex items-center justify-center text-teal-400 font-bold text-lg shadow-sm">
          R
        </div>
        <div>
          <span className="font-extrabold text-[#0B2530] text-lg tracking-tight">RelieFin</span>
          <span className="block text-[10px] text-teal-700 font-semibold tracking-wider uppercase -mt-1">Copiloto</span>
        </div>
      </div>

      <nav className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto">
        <button
          onClick={() => onNavigate('home')}
          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${
            currentScreen === 'home' ? 'bg-slate-100 text-[#0B2530]' : 'text-slate-600 hover:text-[#0B2530]'
          }`}
        >
          Inicio
        </button>

        <button
          onClick={() => onNavigate('snapshot')}
          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${
            currentScreen === 'snapshot' ? 'bg-slate-100 text-[#0B2530]' : 'text-slate-600 hover:text-[#0B2530]'
          }`}
        >
          Radiografía
        </button>

        <button
          onClick={() => onNavigate('personalized_plan')}
          className={`relative text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${
            currentScreen === 'personalized_plan' ? 'bg-teal-50 text-teal-800' : 'text-teal-700 hover:bg-teal-50'
          }`}
        >
          Plan
          <span className="absolute -top-1 -right-1 bg-teal-600 text-[9px] text-white font-bold px-1 rounded-full">
            Nuevo
          </span>
        </button>

        <button
          onClick={() => onNavigate('applications')}
          className={`relative text-xs font-semibold px-2.5 py-1.5 rounded-lg transition flex items-center ${
            currentScreen === 'applications' ? 'bg-slate-100 text-[#0B2530]' : 'text-slate-600 hover:text-[#0B2530]'
          }`}
        >
          <span>Solicitudes</span>
          {applicationsCount > 0 && (
            <span className="bg-[#0B2530] text-[10px] text-white px-1.5 py-0.2 rounded-full font-bold ml-1">
              {applicationsCount}
            </span>
          )}
        </button>

        {hasRestructuring && (
          <button
            onClick={() => onNavigate('evolution')}
            className={`text-xs font-semibold px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 transition ${
              currentScreen === 'evolution' ? 'ring-2 ring-emerald-500' : ''
            }`}
          >
            Evolución
          </button>
        )}

        <button
          onClick={() => onNavigate('premium')}
          className={`text-xs font-semibold px-2 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition flex items-center space-x-1 ${
            currentScreen === 'premium' ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          <span>Premium</span>
          <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-bold">Beta</span>
        </button>
      </nav>
    </header>
  );
};
