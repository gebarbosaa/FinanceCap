import React, { useEffect, useState } from 'react';
import {
  Building2,
  Car,
  TrendingUp,
  Target,
  PiggyBank,
  ShieldCheck,
  Plus,
  Coins,
} from 'lucide-react';
import {
  PatrimonyItem,
  Investment,
  Goal,
  FinancialSummary,
} from '../types/finance';
import { formatCurrency, formatDateBR, parseToCentavos } from '../services/currency';

interface PatrimonyViewProps {
  initialTab?: 'BALANCO' | 'INVESTIMENTOS' | 'METAS';
  patrimony: PatrimonyItem[];
  investments: Investment[];
  goals: Goal[];
  summary: FinancialSummary;
  onAddPatrimony: (item: Omit<PatrimonyItem, 'id'>) => void;
  onUpdatePatrimony: (id: string, updates: Partial<Omit<PatrimonyItem, 'id'>>) => void;
  onAddInvestment: (inv: Omit<Investment, 'id'>) => void;
  onUpdateInvestment: (id: string, updates: Partial<Omit<Investment, 'id'>>) => void;
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => void;
}

export const PatrimonyView: React.FC<PatrimonyViewProps> = ({
  initialTab = 'BALANCO',
  patrimony,
  investments,
  goals,
  summary,
  onAddPatrimony,
  onAddInvestment,
  onAddGoal,
  onUpdatePatrimony,
  onUpdateInvestment,
  onUpdateGoal,
}) => {
  const [activeTab, setActiveTab] = useState<'BALANCO' | 'INVESTIMENTOS' | 'METAS'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const totalInvestments = investments.reduce((sum, inv) => sum + inv.saldoAtualCentavos, 0);

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
        <button
          onClick={() => setActiveTab('BALANCO')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'BALANCO'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Balanço Patrimonial & Bens</span>
        </button>

        <button
          onClick={() => setActiveTab('INVESTIMENTOS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'INVESTIMENTOS'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Carteira de Investimentos</span>
        </button>

        <button
          onClick={() => setActiveTab('METAS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'METAS'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Metas Financeiras & Objetivos</span>
        </button>
      </div>

      {activeTab === 'BALANCO' && (
        <div className="space-y-6">
          {/* Net Worth Card */}
          <div className="bg-gradient-to-r from-[#11100F] via-[#21170F] to-[#3A210F] text-white p-6 rounded-2xl shadow-lg border border-orange-500/30 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-orange-200 uppercase tracking-wider">
                Patrimônio Líquido Barbosa Fernandes
              </span>
              <div className="text-3xl font-black tracking-tight mt-1">
                {formatCurrency(summary.patrimonioLiquidoCentavos)}
              </div>
              <p className="text-xs text-white/70 mt-1">
                Ativos Reais ({formatCurrency(summary.totalAtivosCentavos)}) - Passivos ({formatCurrency(summary.totalPassivosCentavos)})
              </p>
            </div>

            <div className="flex gap-4">
              <div className="bg-black/20 px-4 py-2.5 rounded-xl border border-white/10 text-right">
                <span className="text-[10px] text-white/70 block uppercase">Ativos Totais</span>
                <span className="text-sm font-bold text-emerald-400">
                  {formatCurrency(summary.totalAtivosCentavos)}
                </span>
              </div>
              <div className="bg-black/20 px-4 py-2.5 rounded-xl border border-white/10 text-right">
                <span className="text-[10px] text-white/70 block uppercase">Passivos Totais</span>
                <span className="text-sm font-bold text-rose-400">
                  {formatCurrency(summary.totalPassivosCentavos)}
                </span>
              </div>
            </div>
          </div>

          {/* Physical Assets List */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Ativos Físicos & Bens Cadastrados</h3>
              <button type="button" onClick={() => {
                const descricao = window.prompt('Descrição do bem:');
                if (!descricao?.trim()) return;
                const valor = parseToCentavos(window.prompt('Valor de avaliação (R$):') || '');
                if (!Number.isSafeInteger(valor) || valor <= 0) { window.alert('Informe um valor válido.'); return; }
                const tipo = (window.prompt('Natureza: 1 para ativo ou 2 para passivo', '1') || '1') === '2' ? 'PASSIVO' : 'ATIVO';
                const subtypes: PatrimonyItem['subtipo'][] = ['IMOVEL','VEICULO','CONTA_BANCARIA','INVESTIMENTO','NEGOCIO','BENS_DIVERSOS','DIVIDA_PESSOAL','OUTRO_PASSIVO'];
                const subtypeText = subtypes.map((item,index) => `${index + 1}. ${item.replaceAll('_',' ')}`).join('\n');
                const subtypeIndex = Number(window.prompt(`Tipo do bem/passivo:\n${subtypeText}`, '6')) - 1;
                const subtipo = subtypes[subtypeIndex];
                if (!subtipo) { window.alert('Tipo inválido.'); return; }
                onAddPatrimony({ tipo, subtipo, descricao: descricao.trim(), valorAvaliacaoCentavos: valor, dataAvaliacao: new Date().toISOString().slice(0, 10) });
              }} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white">Adicionar bem</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patrimony.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 flex justify-between items-center"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      {item.subtipo === 'IMOVEL' ? (
                        <Building2 className="w-5 h-5" />
                      ) : (
                        <Car className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.descricao}
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        Avaliação: {formatDateBR(item.dataAvaliacao)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {formatCurrency(item.valorAvaliacaoCentavos)}
                    </span>
                    <span className={`block text-[10px] font-bold ${item.tipo === 'ATIVO' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.tipo}</span>
                    <button type="button" onClick={() => {
                      const description = window.prompt('Descrição:', item.descricao);
                      if (description === null || !description.trim()) return;
                      const valueText = window.prompt('Valor de avaliação (R$):', (item.valorAvaliacaoCentavos / 100).toFixed(2).replace('.', ','));
                      if (valueText === null) return;
                      const value = parseToCentavos(valueText);
                      if (!Number.isSafeInteger(value) || value <= 0) { window.alert('Informe um valor válido.'); return; }
                      onUpdatePatrimony(item.id, { descricao: description.trim(), valorAvaliacaoCentavos: value, dataAvaliacao: new Date().toISOString().slice(0, 10) });
                    }} className="mt-1 text-[10px] font-bold text-orange-600">Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'INVESTIMENTOS' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Carteira de Investimentos</h2>
                <button type="button" onClick={() => {
                  const produto = window.prompt('Nome do investimento:');
                  if (!produto?.trim()) return;
                  const instituicao = window.prompt('Instituição financeira:') || 'Não informada';
                  const aplicado = parseToCentavos(window.prompt('Valor aplicado (R$):') || '');
                  const saldo = parseToCentavos(window.prompt('Saldo atual (R$):') || '');
                  if (!Number.isSafeInteger(aplicado) || aplicado <= 0 || !Number.isSafeInteger(saldo) || saldo < 0) { window.alert('Informe valores válidos.'); return; }
                  const today = new Date().toISOString().slice(0, 10);
                  const categories: Investment['categoria'][] = ['RENDA_FIXA_CDB','TESOURO_DIRETO','LCI_LCA','ACOES','FUNDOS_IMOBILIARIOS','CRIPTO','PREVIDENCIA'];
                  const categoryText = categories.map((item,index) => `${index + 1}. ${item.replaceAll('_',' ')}`).join('\n');
                  const categoryIndex = Number(window.prompt(`Categoria do investimento:\n${categoryText}`, '1')) - 1;
                  const category = categories[categoryIndex];
                  if (!category) { window.alert('Categoria inválida.'); return; }
                  onAddInvestment({ instituicao: instituicao.trim(), produto: produto.trim(), categoria: category, dataAplicacao: today, valorInvestidoCentavos: aplicado, saldoAtualCentavos: saldo, rentabilidadeHistoricaPercentual: aplicado ? Number(((saldo / aplicado - 1) * 100).toFixed(2)) : 0, dataAtualizacao: today });
                }} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white">Adicionar investimento</button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Custódia em corretoras autorizadas (XP, Itaú). Rentabilidade e marcação a mercado.
              </p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-right">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider block">
                Patrimônio Investido
              </span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                {formatCurrency(totalInvestments)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {investments.map((inv) => (
              <div
                key={inv.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {inv.instituicao} • {inv.categoria.replace('_', ' ')}
                    </span>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
                      {inv.produto}
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    +{inv.rentabilidadeHistoricaPercentual}%
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valor Aplicado:</span>
                    <span className="font-semibold">{formatCurrency(inv.valorInvestidoCentavos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Saldo Atualizado:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(inv.saldoAtualCentavos)}
                    </span>
                  </div>
                  <button type="button" onClick={() => {
                    const valueText = window.prompt('Saldo atualizado (R$):', (inv.saldoAtualCentavos / 100).toFixed(2).replace('.', ','));
                    if (valueText === null) return;
                    const value = parseToCentavos(valueText);
                    if (!Number.isSafeInteger(value) || value < 0) { window.alert('Informe um saldo válido.'); return; }
                    onUpdateInvestment(inv.id, { saldoAtualCentavos: value, rentabilidadeHistoricaPercentual: Number(((value / inv.valorInvestidoCentavos - 1) * 100).toFixed(2)), dataAtualizacao: new Date().toISOString().slice(0, 10) });
                  }} className="text-[10px] font-bold text-orange-600">Atualizar saldo</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'METAS' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Metas Financeiras & Objetivos</h2>
              <button type="button" onClick={() => {
                const nome = window.prompt('Nome da meta:');
                if (!nome?.trim()) return;
                const alvo = parseToCentavos(window.prompt('Valor-alvo (R$):') || '');
                const aporte = parseToCentavos(window.prompt('Aporte mensal (R$):') || '');
                const prazo = window.prompt('Prazo (AAAA-MM-DD):') || '';
                if (!Number.isSafeInteger(alvo) || alvo <= 0 || !Number.isSafeInteger(aporte) || aporte < 0 || !/^\\d{4}-\\d{2}-\\d{2}$/.test(prazo)) { window.alert('Revise o valor, aporte e prazo.'); return; }
                const priorityChoice = Number(window.prompt('Prioridade: 1 alta, 2 média, 3 baixa', '2'));
                const prioridade = ({1:'ALTA',2:'MEDIA',3:'BAIXA'} as const)[priorityChoice as 1|2|3];
                if (!prioridade) { window.alert('Prioridade inválida.'); return; }
                onAddGoal({ nome: nome.trim(), valorAlvoCentavos: alvo, valorAcumuladoCentavos: 0, prazo, prioridade, aporteMensalCentavos: aporte });
              }} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white">Adicionar meta</button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Planejamento de poupança mensal calculada para atingir cada objetivo no prazo desejado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const pct = (goal.valorAcumuladoCentavos / goal.valorAlvoCentavos) * 100;
              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {goal.nome}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-orange-200">
                        {goal.prioridade}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mb-3">{goal.descricao}</p>

                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Concluído:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Acumulado:</span>
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(goal.valorAcumuladoCentavos)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Alvo:</span>
                        <span className="font-bold">{formatCurrency(goal.valorAlvoCentavos)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-semibold text-blue-600">
                        <span>Aporte Mensal:</span>
                        <span>{formatCurrency(goal.aporteMensalCentavos)} / mês</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <span>Prazo alvo: {formatDateBR(goal.prazo)}</span>
                    <button type="button" onClick={() => {
                      const valueText = window.prompt('Valor acumulado (R$):', (goal.valorAcumuladoCentavos / 100).toFixed(2).replace('.', ','));
                      if (valueText === null) return;
                      const value = parseToCentavos(valueText);
                      if (!Number.isSafeInteger(value) || value < 0) { window.alert('Informe um valor válido.'); return; }
                      onUpdateGoal(goal.id, { valorAcumuladoCentavos: value });
                    }} className="font-bold text-orange-600">Atualizar progresso</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
