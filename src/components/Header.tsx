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
    <header className={`sticky top-0 z-30 border-b shadow-md transition-colors duration-200 ${darkMode ? "bg-[#0B2545] text-white border-[#1F4E79]" : "bg-white text-slate-900 border-slate-200"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-2.5">
          {/* Logo and System Title */}
          <div className="flex min-w-0 flex-1 items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1F4E79] to-[#0B2545] border border-[#3B82F6]/30 flex items-center justify-center shadow-inner">
              <Wallet className="w-6 h-6 text-amber-400" />
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
              <div className={`hidden sm:flex text-xs items-center space-x-1.5 ${darkMode ? "text-blue-200/70" : "text-slate-500"}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gestão Executiva Patrimonial & Sincronização Google Sheets</span>
              </div>
            </div>
          </div>

          {/* Center Competence Selector */}
          <div className={`hidden xl:flex shrink-0 items-center space-x-2 px-3 py-1.5 rounded-lg border ${darkMode ? "bg-[#1F4E79]/50 border-[#1F4E79]" : "bg-slate-50 border-slate-200"}`}>
            <span className={`text-xs font-medium ${darkMode ? "text-blue-200" : "text-slate-500"}`}>Competência:</span>
            <select
              value={currentCompetencia}
              onChange={(e) => onCompetenciaChange(e.target.value)}
              aria-label="Selecionar competência"
              className={`text-xs font-semibold rounded px-2.5 py-1 border focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer ${darkMode ? "bg-[#0B2545] text-white border-blue-400/30" : "bg-white text-slate-800 border-slate-300"}`}
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
            <div className={`hidden 2xl:flex flex-col items-end px-3 py-1 rounded-lg border ${darkMode ? "bg-[#1F4E79]/40 border-blue-400/20" : "bg-slate-50 border-slate-200"}`}>
              <span className={`text-[10px] uppercase tracking-wider ${darkMode ? "text-blue-200" : "text-slate-500"}`}>Disponível p/ Gastar</span>
              <span className="text-sm font-bold text-emerald-400">
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
              className={`hidden lg:flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition cursor-pointer ${darkMode ? "bg-[#1F4E79] hover:bg-[#286399] text-white border-blue-400/30" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"}`}
              title="Sincronizar com Google Sheets e Google Drive"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Google Sheets</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className={`flex p-2 rounded-lg transition cursor-pointer ${darkMode ? "text-blue-200 hover:text-white hover:bg-[#1F4E79]" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
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
                    className={`flex items-center space-x-2 p-1.5 rounded-lg transition cursor-pointer ${darkMode ? "hover:bg-[#1F4E79]" : "hover:bg-slate-100"}`}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Usuário'}
                        className="w-7 h-7 rounded-full border border-blue-400/40"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'B'}
                      </div>
                    )}
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-slate-800 dark:text-slate-100">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold truncate">{user.displayName || 'Barbosa Fernandes'}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenSheetsSync();
                        }}
                        className="w-full text-left px-4 py-2 text-xs flex items-center space-x-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Gerenciar 32 Abas Sheets</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs flex items-center space-x-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Desconectar Conta Google</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onLogin}
                  className="text-xs bg-white text-slate-900 font-semibold px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition flex items-center space-x-1.5 cursor-pointer shadow"
                >
                  <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Conectar Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
