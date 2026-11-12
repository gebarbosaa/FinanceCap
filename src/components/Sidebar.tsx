import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  CreditCard as CardIcon,
  Layers,
  CalendarDays,
  Landmark,
  PiggyBank,
  Target,
  Sparkles,
  Radar,
  Calculator,
  UploadCloud,
  FileSpreadsheet,
  History,
  CheckCircle2,
  Settings,
  Tags,
  ChevronRight,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'transactions'
  | 'cards'
  | 'installments'
  | 'planning'
  | 'debts'
  | 'patrimony'
  | 'goals'
  | 'intelligence'
  | 'radar'
  | 'simulator'
  | 'conciliation'
  | 'reports'
  | 'audit'
  | 'tests'
  | 'settings'
  | 'categories';

import { User } from 'firebase/auth';
import { GoogleLogo } from './GoogleAuthButton';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  radarAlertCount: number;
  openInvoiceCount: number;
  darkMode: boolean;
  user?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onOpenSheetsSync?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  radarAlertCount,
  openInvoiceCount,
  darkMode,
  user = null,
  onLogin,
  onLogout,
  onOpenSheetsSync,
}) => {
  const menuItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
    section?: string;
  }> = [
    { section: 'VISÃO EXECUTIVA', id: 'dashboard', label: 'Dashboard Geral', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'intelligence', label: 'BF Intelligence', icon: <Sparkles className="w-4 h-4 text-orange-500" />, badge: 'IA Real', badgeColor: 'bg-amber-500/20 text-amber-300' },
    { id: 'radar', label: 'Radar de Gastos', icon: <Radar className="w-4 h-4 text-rose-400" />, badge: radarAlertCount > 0 ? radarAlertCount : undefined, badgeColor: 'bg-rose-500 text-white' },

    { section: 'OPERAÇÕES & CRÉDITO', id: 'transactions', label: 'Lançamentos', icon: <Receipt className="w-4 h-4" /> },
    { id: 'cards', label: 'Cartões & Faturas', icon: <CardIcon className="w-4 h-4" />, badge: openInvoiceCount > 0 ? `${openInvoiceCount} aberta` : undefined, badgeColor: 'bg-orange-500 text-white' },
    { id: 'installments', label: 'Parcelamentos', icon: <Layers className="w-4 h-4" /> },
    { id: 'conciliation', label: 'Conciliação CSV', icon: <UploadCloud className="w-4 h-4" /> },

    { section: 'PLANEJAMENTO & ESTRATÉGIA', id: 'planning', label: 'Orçamento & 12 Meses', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'simulator', label: 'Simulador Financeiro', icon: <Calculator className="w-4 h-4" /> },
    { id: 'debts', label: 'Dívidas & Passivos', icon: <Landmark className="w-4 h-4" /> },
    { id: 'patrimony', label: 'Patrimônio & Invest.', icon: <PiggyBank className="w-4 h-4" /> },
    { id: 'goals', label: 'Metas Financeiras', icon: <Target className="w-4 h-4" /> },

    { section: 'DADOS & GOVERNANÇA', id: 'reports', label: '32 Abas & Relatórios', icon: <FileSpreadsheet className="w-4 h-4 text-orange-500" /> },
    { id: 'audit', label: 'Log de Auditoria', icon: <History className="w-4 h-4" /> },
    { id: 'tests', label: 'Testes do Sistema (20)', icon: <CheckCircle2 className="w-4 h-4 text-orange-500" />, badge: '20/20', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
    { id: 'categories', label: 'Categorias', icon: <Tags className="w-4 h-4" /> },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className={`bf-sidebar w-16 lg:w-64 flex flex-col justify-between flex-shrink-0 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto overflow-x-hidden select-none border-r transition-colors duration-200 ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
      <div className="py-4 px-3 space-y-6">
        {/* Navigation Sections */}
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <React.Fragment key={item.id}>
              {item.section && (
                <div className="hidden lg:block pt-2 px-3">
                  <span className={`text-[10px] font-bold tracking-wider uppercase ${darkMode ? "text-white/55" : "text-black/55"}`}>
                    {item.section}
                  </span>
                </div>
              )}
              <button
                title={item.label}
                aria-label={item.label}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-center lg:justify-between px-2 lg:px-3 py-2.5 lg:py-2 rounded-lg text-xs font-semibold transition cursor-pointer group ${
                  isActive
                    ? darkMode ? "bg-white/10 text-white shadow-sm border-l-4 border-orange-500 pl-2" : "bg-black/5 text-black shadow-sm border-l-4 border-orange-500 pl-2"
                    : darkMode ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-black/75 hover:bg-black/5 hover:text-black"
                }`}
              >
                <div className="flex min-w-0 items-center justify-center lg:justify-start space-x-0 lg:space-x-2.5 truncate">
                  <span className={`${isActive ? "text-amber-500" : darkMode ? "text-white/70 group-hover:text-orange-400" : "text-black/55 group-hover:text-orange-600"}`}>
                    {item.icon}
                  </span>
                  <span className="hidden lg:inline truncate">{item.label}</span>
                </div>

                <div className="hidden lg:flex items-center space-x-1.5 flex-shrink-0">
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        item.badgeColor || 'bg-orange-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="hidden lg:block w-3.5 h-3.5 text-amber-400" />}
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Google Authentication Box in Sidebar Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700/60 mt-auto">
        {user ? (
          <div className="hidden lg:block p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google User'}
                  className="w-8 h-8 rounded-full border border-orange-500"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">
                  {user.displayName?.split(' ')[0] || 'Barbosa F.'}
                </p>
                <div className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                    Google Conectado
                  </span>
                </div>
              </div>
            </div>
            {onOpenSheetsSync && (
              <button
                type="button"
                onClick={onOpenSheetsSync}
                className="w-full mt-2 py-1 text-[11px] font-semibold text-center rounded-lg bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-500 dark:hover:bg-orange-600 transition cursor-pointer"
              >
                Sincronizar Sheets
              </button>
            )}
          </div>
        ) : (
          <div className="hidden lg:block p-3 rounded-xl bg-gradient-to-br from-orange-50 to-white dark:from-[#17120d] dark:to-[#141414] border border-orange-200 dark:border-orange-900/50 text-center space-y-2">
            <div className="flex items-center justify-center space-x-1.5">
              <GoogleLogo className="w-4 h-4" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Google Workspace
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Sincronize 32 abas no Sheets e backups no Drive.
            </p>
            {onLogin && (
              <button
                type="button"
                onClick={onLogin}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer active:scale-95"
              >
                <GoogleLogo className="w-3.5 h-3.5" />
                <span>Entrar com Google</span>
              </button>
            )}
          </div>
        )}

        {/* Compact Mobile Google Button */}
        <div className="lg:hidden flex justify-center">
          {user ? (
            <div
              title={`Conectado: ${user.email}`}
              className="w-8 h-8 rounded-full border-2 border-orange-500 overflow-hidden"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Google" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center">
                  G
                </div>
              )}
            </div>
          ) : (
            onLogin && (
              <button
                type="button"
                onClick={onLogin}
                title="Entrar com Google"
                aria-label="Entrar com Google"
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-sm cursor-pointer"
              >
                <GoogleLogo className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>
    </aside>
  );
};
