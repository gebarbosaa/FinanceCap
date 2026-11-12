import React, { useState } from 'react';
import { History, ShieldCheck, Search, Filter, Lock } from 'lucide-react';
import { AuditLog } from '../types/finance';

interface AuditViewProps {
  auditLogs: AuditLog[];
}

export const AuditView: React.FC<AuditViewProps> = ({ auditLogs }) => {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('TODAS');

  const filtered = auditLogs.filter((log) => {
    if (filterAction !== 'TODAS' && log.acao !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.entidade.toLowerCase().includes(q) ||
        log.motivo.toLowerCase().includes(q) ||
        log.usuario.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-600" />
            <span>Trilha de Auditoria Imutável (Aba 16)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registro cronológico protegido de todas as operações, edições, liquidações e exclusões lógicas do sistema.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Histórico Blindado: Nunca é apagado</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por entidade, motivo ou usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white"
        >
          <option value="TODAS">Todas as Ações</option>
          <option value="CRIAR">Criar</option>
          <option value="EDITAR">Editar</option>
          <option value="EXCLUIR_LOGICA">Exclusão Lógica</option>
          <option value="PAGAMENTO_FATURA">Pagamento de Fatura</option>
          <option value="ESTORNAR">Estorno</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Timestamp (UTC/BR)</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Entidade</th>
                <th className="py-3 px-4">Justificativa / Motivo</th>
                <th className="py-3 px-4">Registro ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {new Date(log.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                  </td>
                  <td className="py-3 px-4 font-bold">{log.usuario}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        log.acao === 'CRIAR'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.acao === 'EDITAR'
                          ? 'bg-blue-100 text-blue-800'
                          : log.acao === 'EXCLUIR_LOGICA'
                          ? 'bg-rose-100 text-rose-800'
                          : log.acao === 'PAGAMENTO_FATURA'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {log.acao}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    {log.entidade}
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400">
                    {log.motivo}
                  </td>
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                    {log.registroId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
