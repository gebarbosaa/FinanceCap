import React from 'react';
import { Radar, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import { RadarAlert } from '../services/radarService';
import { formatCurrency } from '../services/currency';

interface RadarViewProps {
  alerts: RadarAlert[];
  onNavigate: (tab: any) => void;
}

export const RadarView: React.FC<RadarViewProps> = ({ alerts, onNavigate }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Radar className="w-5 h-5 text-rose-500" />
            <span>Radar de Gastos & Anomalias</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Varredura contínua de despesas duplicadas, estouro de categorias, recorrências pendentes e risco de liquidez.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
            {alerts.length} alerta(s) ativo(s)
          </span>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Nenhuma anomalia financeira detectada
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Todos os seus lançamentos estão dentro dos limites planejados, faturas em dia e sem lançamentos duplicados identificados.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition ${
                alert.nivel === 'URGENTE'
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                  : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
                    alert.nivel === 'URGENTE'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        alert.nivel === 'URGENTE'
                          ? 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                          : 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                      }`}
                    >
                      {alert.tipo.replace('_', ' ')}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {alert.titulo}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {alert.mensagem}
                  </p>
                </div>
              </div>

              {alert.valorCentavos && (
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Montante Afetado
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {formatCurrency(alert.valorCentavos)}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
