import React from 'react';

interface TopBarProps {
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  onOpenAnalytics: () => void;
  onResetData: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isMobileFrame,
  onToggleFrame,
  onOpenAnalytics,
  onResetData
}) => {
  return (
    <div className="bg-[#0B2530] text-slate-300 text-xs py-2 px-4 flex items-center justify-between border-b border-slate-700/60 sticky top-0 z-50">
      <div className="flex items-center space-x-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-semibold text-white tracking-wide">RelieFin MVP</span>
        <span className="hidden sm:inline text-slate-400">| Fintech Colombia</span>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleFrame}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-600 transition flex items-center space-x-1"
          title="Alternar entre modo móvil y pantalla completa"
        >
          <span>{isMobileFrame ? '📱 Vista Móvil (440px)' : '💻 Vista Amplia (Desktop)'}</span>
        </button>

        <button
          onClick={onOpenAnalytics}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded border border-slate-600 transition"
          title="Ver métricas de conversión y eventos locales"
        >
          📊 Métricas
        </button>

        <button
          onClick={onResetData}
          className="text-rose-300 hover:text-rose-100 transition font-medium"
        >
          Reiniciar demo
        </button>
      </div>
    </div>
  );
};
