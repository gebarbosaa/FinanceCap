import React, { useState } from 'react';
import { CheckCircle2, XCircle, Play, ShieldCheck, Clock, RefreshCw } from 'lucide-react';
import { runAll20MandatoryTests, TestCaseResult } from '../services/testSuite';
import confetti from 'canvas-confetti';

export const TestsRunnerView: React.FC = () => {
  const [results, setResults] = useState<TestCaseResult[]>(() => runAll20MandatoryTests());
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runAll20MandatoryTests();
      setResults(res);
      setIsRunning(false);

      const allPassed = res.every((r) => r.aprovado);
      if (allPassed) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    }, 250);
  };

  const totalPassed = results.filter((r) => r.aprovado).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Suíte de 21 Testes Internos
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {totalPassed} / {results.length} Aprovados
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Validação automatizada das 21 verificações de integridade matemática e fluxos de caixa exigidos no Prompt Mestre.
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={isRunning}
          className="flex items-center space-x-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>Executar 21 Testes Novamente</span>
        </button>
      </div>

      {/* Sandbox Notice */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center space-x-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span>
          <strong>Isolamento Garantido:</strong> Os testes operam em ambiente sandbox 100% isolado em memória e não alteram seus lançamentos reais.
        </span>
      </div>

      {/* Test Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((test) => (
          <div
            key={test.id}
            className={`p-4 rounded-2xl border transition shadow-sm flex items-start justify-between gap-3 ${
              test.aprovado
                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="mt-0.5">
                {test.aprovado ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-slate-400">#{test.id}</span>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    {test.nome}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {test.descricao}
                </p>
                <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 mt-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  {test.mensagem}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-[10px] text-slate-400 flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span>{test.duracaoMs}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
