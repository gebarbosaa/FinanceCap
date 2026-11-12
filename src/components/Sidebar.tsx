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

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  radarAlertCount: number;
  openInvoiceCount: number;
  darkMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  radarAlertCount,
  openInvoiceCount,
  darkMode,
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
    { id: 'intelligence', label: 'BF Intelligence', icon: <Sparkles className="w-4 h-4 text-amber-400" />, badge: 'IA Real', badgeColor: 'bg-amber-500/20 text-amber-300' },
    { id: 'radar', label: 'Radar de Gastos', icon: <Radar className="w-4 h-4 text-rose-400" />, badge: radarAlertCount > 0 ? radarAlertCount : undefined, badgeColor: 'bg-rose-500 text-white' },

    { section: 'OPERAÇÕES & CRÉDITO', id: 'transactions', label: 'Lançamentos', icon: <Receipt className="w-4 h-4" /> },
    { id: 'cards', label: 'Cartões & Faturas', icon: <CardIcon className="w-4 h-4" />, badge: openInvoiceCount > 0 ? `${openInvoiceCount} aberta` : undefined, badgeColor: 'bg-blue-600 text-white' },
    { id: 'installments', label: 'Parcelamentos', icon: <Layers className="w-4 h-4" /> },
    { id: 'conciliation', label: 'Conciliação CSV', icon: <UploadCloud className="w-4 h-4" /> },

    { section: 'PLANEJAMENTO & ESTRATÉGIA', id: 'planning', label: 'Orçamento & 12 Meses', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'simulator', label: 'Simulador Financeiro', icon: <Calculator className="w-4 h-4" /> },
    { id: 'debts', label: 'Dívidas & Passivos', icon: <Landmark className="w-4 h-4" /> },
    { id: 'patrimony', label: 'Patrimônio & Invest.', icon: <PiggyBank className="w-4 h-4" /> },
    { id: 'goals', label: 'Metas Financeiras', icon: <Target className="w-4 h-4" /> },

    { section: 'DADOS & GOVERNANÇA', id: 'reports', label: '32 Abas & Relatórios', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> },
    { id: 'audit', label: 'Log de Auditoria', icon: <History className="w-4 h-4" /> },
    { id: 'tests', label: 'Testes do Sistema (20)', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, badge: '20/20', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
    { id: 'categories', label: 'Categorias', icon: <Tags className="w-4 h-4" /> },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className={`bf-sidebar w-16 lg:w-64 flex flex-col flex-shrink-0 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto overflow-x-hidden select-none border-r transition-colors duration-200 ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
      <div className="bf-sidebar-items py-4 px-3 space-y-6">
        {/* Navigation Sections */}
        {menuItems.map((item, index) => {
          const isActive = activeTab === item.id;
          return (
            <React.Fragment key={item.id}>
              {item.section && (
                <div className="hidden lg:block pt-2 px-3">
                  <span className={`text-[10px] font-bold tracking-wider uppercase ${darkMode ? "text-blue-300/60" : "text-slate-400"}`}>
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
                    ? darkMode ? "bg-[#1F4E79] text-white shadow-sm border-l-4 border-amber-400 pl-2" : "bg-blue-50 text-blue-900 shadow-sm border-l-4 border-amber-500 pl-2"
                    : darkMode ? "text-slate-300 hover:bg-[#1F4E79]/50 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <div className="flex min-w-0 items-center justify-center lg:justify-start space-x-0 lg:space-x-2.5 truncate">
                  <span className={`${isActive ? "text-amber-500" : darkMode ? "text-blue-300 group-hover:text-white" : "text-slate-400 group-hover:text-blue-700"}`}>
                    {item.icon}
                  </span>
                  <span className="bf-sidebar-label hidden lg:inline truncate">{item.label}</span>
                </div>

                <div className="hidden lg:flex items-center space-x-1.5 flex-shrink-0">
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        item.badgeColor || 'bg-blue-600 text-white'
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

    </aside>
  );
};
