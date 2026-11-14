import React, { useState } from 'react';
import {
  Wallet,
  PlusCircle,
  FileSpreadsheet,
  Moon,
  Sun,
  CloudUpload,
  User as UserIcon,
  LogOut,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency, formatCompetencia } from '../services/currency';
import { FinancialSummary } from '../types/finance';
import { User } from 'firebase/auth';

interface HeaderProps {
  summary: FinancialSummary;
  currentCompetencia: string;
  onCompetenciaChange: (comp: string) => void;
  onOpenQuickTx: () => void;
  onOpenSheetsSync: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  summary,
  currentCompetencia,
  onCompetenciaChange,
  onOpenQuickTx,
  onOpenSheetsSync,
  user,
  onLogin,
  onLogout,
  darkMode,
  onToggleDarkMode,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Available competencies (current year + past/future)
  const competencies = [
    '2026-08',
    '2026-09',
    '2026-10',
    '2026-11',
    '2026-12',
    '2027-01',
    '2027-02',
  ];

  return (
    <header className={`bf-header sticky top-0 z-30 border-b transition-colors duration-200 ${darkMode ? "text-white" : "text-slate-900"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-2.5">
          {/* Logo and System Title */}
          <div className="flex min-w-0 flex-1 items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 border border-orange-400/30 flex items-center justify-center shadow-inner">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center space-x-2">
                <span className={`truncate font-bold tracking-tight text-sm sm:text-base ${darkMode ? "text-white" : "text-slate-900"}`}>
                  BARBOSA FERNANDES
                </span>
                <span className="hidden lg:inline-flex bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  BF Finance OS
                </span>
              </div>
              <div className={`hidden sm:flex text-xs items-center space-x-1.5 ${darkMode ? "text-white/75" : "text-black/65"}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                <span>Gestão Executiva Patrimonial & Sincronização Google Sheets</span>
              </div>
            </div>
          </div>

          {/* Center Competence Selector */}
          <div className={`hidden xl:flex shrink-0 items-center space-x-2 px-3 py-1.5 rounded-lg border ${darkMode ? "bg-orange-500 border-orange-500" : "bg-orange-500 border-orange-500"}`}>
            <span className={`text-xs font-medium ${darkMode ? "text-white" : "text-black"}`}>Competência:</span>
            <select
              value={currentCompetencia}
              onChange={(e) => onCompetenciaChange(e.target.value)}
              aria-label="Selecionar competência"
              className={`text-xs font-semibold rounded px-2.5 py-1 border focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer ${darkMode ? "bg-orange-600 text-white border-orange-400" : "bg-orange-600 text-white border-orange-500"}`}
            >
              {competencies.map((c) => (
                <option key={c} value={c}>
                  {formatCompetencia(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {/* Quick Available Cash Pill */}
            <div className={`hidden 2xl:flex flex-col items-end px-3 py-1 rounded-lg border ${darkMode ? "bg-[#141414] border-white/10" : "bg-white border-black/10"}`}>
              <span className={`text-[10px] uppercase tracking-wider ${darkMode ? "text-white" : "text-black"}`}>Disponível p/ Gastar</span>
              <span className="text-sm font-bold text-orange-500">
                {formatCurrency(summary.dinheiroDisponivelGastarCentavos)}
              </span>
            </div>

            {/* Quick Add Transaction Button */}
            <button
              onClick={onOpenQuickTx}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Lançamento</span>
            </button>

            {/* Google Sheets Sync Trigger */}
            <button
              onClick={onOpenSheetsSync}
              className={`hidden lg:flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition cursor-pointer ${darkMode ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" : "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"}`}
              title="Sincronizar com Google Sheets e Google Drive"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Google Sheets</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className={`flex p-2 rounded-lg transition cursor-pointer ${darkMode ? "text-white hover:text-white hover:bg-white/10" : "text-black hover:text-black hover:bg-black/5"}`}
              title={darkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
              aria-label={darkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
              aria-pressed={darkMode}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Google User Profile */}
            <div className="relative">
              {user ? (
                <div>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    aria-label="Menu da conta Google"
                    className={`flex items-center space-x-2 p-1 rounded-xl transition cursor-pointer border ${darkMode ? "hover:bg-white/10 border-white/10 bg-[#141414]" : "hover:bg-black/5 border-black/10 bg-white"}`}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Usuário Google'}
                        className="w-7 h-7 rounded-lg border border-orange-500/50 object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-xs font-bold text-white">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                      </div>
                    )}
                    <span className="hidden md:inline text-xs font-semibold pr-1 max-w-[120px] truncate">
                      {user.displayName?.split(' ')[0] || 'Conectado'}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2.5 z-50 text-slate-800 dark:text-slate-100 divide-y divide-slate-100 dark:divide-slate-700">
                      <div className="px-4 py-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 dark:text-orange-500">
                            Conta Google Conectada
                          </span>
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                        </div>
                        <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                          {user.displayName || 'Barbosa Fernandes'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                          {user.email}
                        </p>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenSheetsSync();
                          }}
                          className="w-full text-left px-4 py-2 text-xs flex items-center space-x-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-orange-500" />
                          <div>
                            <span className="block font-semibold">Sincronizar 32 Abas</span>
                            <span className="text-[10px] text-slate-400">Google Sheets & Drive</span>
                          </div>
                        </button>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onLogout();
                          }}
                          className="w-full text-left px-4 py-2 text-xs flex items-center space-x-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer font-medium"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Desconectar Conta Google</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  aria-label="Entrar com conta Google"
                  className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-sm transition cursor-pointer active:scale-95"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Entrar com Google</span>
                  <span className="sm:hidden">Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
