import React, { useState } from 'react';

const presentText = (value: string) => value.replace(/\\*\\*/g, '').replace(/\\r\\n/g, '\\n').trim();
import {
  Sparkles,
  Send,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  FileText,
} from 'lucide-react';
import { StorageData } from '../services/storageService';
import { queryBFIntelligence, IntelligenceAnswer } from '../services/intelligenceService';

interface IntelligenceViewProps {
  data: StorageData;
}

export const IntelligenceView: React.FC<IntelligenceViewProps> = ({ data }) => {
  const [question, setQuestion] = useState('');
  const [activeAnswer, setActiveAnswer] = useState<IntelligenceAnswer | null>(() =>
    queryBFIntelligence('Quanto posso gastar hoje?', data)
  );

  const presetQuestions = [
    'Quanto posso gastar hoje?',
    'Qual meu saldo atual?',
    'Quanto gastei este mês?',
    'Quanto recebi?',
    'Qual minha maior categoria de despesas?',
    'Qual cartão está mais comprometido?',
    'Quanto tenho em parcelas futuras?',
    'Quanto devo?',
    'Qual meu patrimônio líquido?',
    'Quanto sobrará no fim do mês?',
  ];

  const handleAsk = (q: string) => {
    const ans = queryBFIntelligence(q, data);
    setActiveAnswer(ans);
    setQuestion('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#11100F] via-[#21170F] to-[#3A210F] text-white p-6 rounded-2xl shadow-lg border border-orange-500/30 relative overflow-hidden">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-amber-500/20 text-orange-200 rounded-xl border border-amber-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              BF Intelligence — Inteligência Financeira Analítica
            </h2>
            <p className="text-xs text-white/70">
              Respostas precisas baseadas exclusivamente em dados reais, com rastreabilidade contábil e sem alucinações.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Questions Chips */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Perguntas Frequentes do Prompt Mestre:
        </span>
        <div className="flex flex-wrap gap-2">
          {presetQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleAsk(q)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-400 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Input */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-2">
        <input
          type="text"
          aria-label="Pergunta sobre suas finanças"
          placeholder="Pergunte sobre gastos, faturas, dívidas ou patrimônio..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && question.trim() && handleAsk(question)}
          className="flex-1 px-4 py-2 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
        />
        <button
          onClick={() => question.trim() && handleAsk(question)}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow"
        >
          <span>Perguntar</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Answer Display Card */}
      {activeAnswer && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md space-y-5 animate-in fade-in">
          {/* Header of Answer */}
          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pergunta Analisada:
              </span>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-0.5">
                {activeAnswer.pergunta}
              </h3>
            </div>

            <span
              className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                activeAnswer.tipoDado === 'DADO_REAL'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
              }`}
            >
              ✓ {activeAnswer.tipoDado.replace('_', ' ')}
            </span>
          </div>

          {/* Direct Answer text with highlight */}
          <div aria-live="polite" aria-atomic="true" className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
              {presentText(activeAnswer.resposta)}
            </p>
          </div>

          {/* Traceability Memory (Audit & Formula) */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Memória de Cálculo & Rastreabilidade de Origem:</span>
            </div>

            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] space-y-1 overflow-x-auto border border-slate-800">
              {activeAnswer.origemRastreavel.map((step, idx) => (
                <div key={idx} className="leading-relaxed">
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Advice */}
          {activeAnswer.recomendacao && (
            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-start space-x-3 text-xs">
              <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-900 dark:text-amber-200 block mb-0.5">
                  Recomendação Estratégica Barbosa Fernandes:
                </strong>
                <p className="text-amber-800 dark:text-orange-200 leading-relaxed">
                  {presentText(activeAnswer.recomendacao)}
                </p>
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Módulo de IA puramente analítico: nenhuma alteração patrimonial é realizada sem autorização explícita do titular.</span>
          </div>
        </div>
      )}
    </div>
  );
};
