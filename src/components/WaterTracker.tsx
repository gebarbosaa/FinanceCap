import React, { useMemo, useState } from 'react';
import { CalendarDays, Droplets, Plus, Target, Trash2, TrendingUp } from 'lucide-react';
import type { WaterIntakeEntry } from '../types/finance';
import { getCurrentDateISO } from '../services/currency';

interface WaterTrackerProps {
  entries: WaterIntakeEntry[];
  dailyGoalMl: number;
  onAdd: (amountMl: number, date: string) => void;
  onDelete: (id: string) => void;
  onGoalChange: (goalMl: number) => void;
}

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDay = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

export const WaterTracker: React.FC<WaterTrackerProps> = ({ entries, dailyGoalMl, onAdd, onDelete, onGoalChange }) => {
  const today = getCurrentDateISO();
  const [amount, setAmount] = useState('250');
  const [entryDate, setEntryDate] = useState(today);
  const [goalInput, setGoalInput] = useState(String(dailyGoalMl || 2000));
  const [editingGoal, setEditingGoal] = useState(false);

  const todayEntries = useMemo(() => entries.filter((entry) => entry.date === today).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [entries, today]);
  const totalToday = todayEntries.reduce((sum, entry) => sum + entry.amountMl, 0);
  const goal = Math.max(250, dailyGoalMl || 2000);
  const progress = Math.min(100, Math.round((totalToday / goal) * 100));
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date);
    return { key, label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), total: entries.filter((entry) => entry.date === key).reduce((sum, entry) => sum + entry.amountMl, 0) };
  }), [entries, today]);
  const maxWeek = Math.max(goal, ...week.map((day) => day.total), 1);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const ml = Number(amount);
    if (!Number.isSafeInteger(ml) || ml < 1 || ml > 5000) {
      alert('Informe uma quantidade entre 1 e 5.000 ml.');
      return;
    }
    onAdd(ml, entryDate);
    setAmount('250');
    setEntryDate(today);
  };

  const saveGoal = () => {
    const next = Number(goalInput);
    if (!Number.isSafeInteger(next) || next < 250 || next > 10000) {
      alert('A meta deve ficar entre 250 e 10.000 ml por dia.');
      return;
    }
    onGoalChange(next);
    setEditingGoal(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500">Saúde & rotina</p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Controle de água</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Acompanhe quanto você bebeu ao longo do dia.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
          <Target className="w-4 h-4 text-orange-500" />
          {editingGoal ? (
            <>
              <input type="number" min="250" max="10000" step="50" value={goalInput} onChange={(event) => setGoalInput(event.target.value)} className="w-20 bg-transparent text-sm font-bold outline-none" aria-label="Meta diária em ml" />
              <button onClick={saveGoal} className="text-xs font-bold text-orange-500">Salvar</button>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-500">Meta diária</span>
              <strong className="text-sm text-slate-900 dark:text-white">{goal.toLocaleString('pt-BR')} ml</strong>
              <button onClick={() => { setGoalInput(String(goal)); setEditingGoal(true); }} className="text-xs font-bold text-orange-500">Alterar</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Consumido hoje</p>
              <div className="flex items-baseline gap-2 mt-1">
                <strong className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{(totalToday / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}<span className="text-lg text-slate-500"> L</span></strong>
                <span className="text-xs text-slate-400">/ {(goal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center"><Droplets className="w-7 h-7" /></div>
          </div>
          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-bold text-orange-500">{progress}% da meta</span>
            <span className="text-slate-500">{Math.max(0, goal - totalToday).toLocaleString('pt-BR')} ml restantes</span>
          </div>
          {totalToday >= goal && <p className="rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-300 px-3 py-2 text-xs font-semibold">Meta diária atingida. Ótimo acompanhamento!</p>}

          <form onSubmit={submit} className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Registrar consumo</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[200, 250, 300, 500].map((ml) => (
                <button key={ml} type="button" onClick={() => setAmount(String(ml))} className={`rounded-xl border py-2 text-xs font-bold transition ${Number(amount) === ml ? 'border-orange-500 bg-orange-500/10 text-orange-600' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>{ml} ml</button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <label className="text-[11px] font-semibold text-slate-500">Quantidade (ml)
                <input type="number" min="1" max="5000" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent p-2.5 text-sm text-slate-900 dark:text-white" />
              </label>
              <label className="text-[11px] font-semibold text-slate-500">Data
                <input type="date" value={entryDate} max={today} onChange={(event) => setEntryDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent p-2.5 text-sm text-slate-900 dark:text-white" />
              </label>
              <button type="submit" className="self-end rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> Registrar</button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" /><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Últimos 7 dias</h3></div>
          <div className="space-y-3">
            {week.map((day) => (
              <div key={day.key} className="grid grid-cols-[42px_1fr_64px] items-center gap-2">
                <span className="text-[10px] capitalize text-slate-500">{day.label}</span>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, day.total / maxWeek * 100)}%` }} /></div>
                <span className="text-[10px] text-right font-semibold text-slate-600 dark:text-slate-300">{day.total.toLocaleString('pt-BR')} ml</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-[11px] text-slate-500"><CalendarDays className="w-4 h-4" /> Histórico salvo e sincronizado na sua conta.</div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between"><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Registros de hoje</h3><span className="text-xs text-slate-500">{todayEntries.length} registro(s)</span></div>
        {todayEntries.length === 0 ? <p className="text-xs text-slate-500 py-5 text-center">Nenhum consumo registrado hoje. Adicione o primeiro copo de água.</p> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {todayEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center"><Droplets className="w-4 h-4" /></span><div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{entry.amountMl.toLocaleString('pt-BR')} ml</p><p className="text-[10px] text-slate-500">{new Date(entry.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div></div>
                <button onClick={() => onDelete(entry.id)} title="Remover registro" className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-[10px] text-slate-400">A meta é configurável e serve como acompanhamento pessoal; necessidades de hidratação variam conforme cada pessoa e situação.</p>
    </div>
  );
};
