import React, { useState, useEffect } from 'react';
import type { Debt, FinancialSnapshot, UserGoal, FinancialAlternative, Application } from './types';
import { calculateSnapshot } from './services/calculations.js';
import { calculatePrecision } from './services/precision.js';
import { rankAlternatives, generateMockAlternatives } from './services/ranking.js';
import { AnalyticsProvider } from './services/analytics.js';
import { StorageService, INITIAL_DEMO_DEBTS } from './services/storage.js';

export const App: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>(INITIAL_DEMO_DEBTS);
  const [userGoal, setUserGoal] = useState<UserGoal>('lower_payment');
  const [screen, setScreen] = useState<string>('home');

  useEffect(() => {
    const saved = StorageService.loadState();
    if (saved.debts) setDebts(saved.debts);
    if (saved.userGoal) setUserGoal(saved.userGoal);
  }, []);

  const snapshot = calculateSnapshot(debts);
  const precision = calculatePrecision(debts);
  const alternatives = rankAlternatives(generateMockAlternatives(snapshot), userGoal, snapshot);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setScreen('home')}>
          <div className="w-8 h-8 rounded-lg bg-[#0B2530] flex items-center justify-center text-teal-400 font-bold text-lg">
            R
          </div>
          <div>
            <span className="font-extrabold text-[#0B2530] text-lg tracking-tight">RelieFin</span>
            <span className="block text-[10px] text-teal-700 font-semibold uppercase -mt-1">Copiloto</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {screen === 'home' && (
          <div className="text-center py-6">
            <h1 className="text-3xl font-extrabold text-[#0B2530] tracking-tight">
              Muchas deudas.<br />
              <span className="text-teal-700">Un camino más claro.</span>
            </h1>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Organiza tus deudas, define qué quieres lograr y compara alternativas financieras según tus prioridades.
            </p>
            <button 
              onClick={() => { AnalyticsProvider.track('started_analysis'); setScreen('snapshot'); }}
              className="mt-6 w-full bg-[#0B2530] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:bg-slate-800 transition"
            >
              Analizar mis deudas
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
