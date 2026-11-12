import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { storageService, StorageData } from './services/storageService';
import { calculateFinancialSummary } from './services/financeEngine';
import { runSpendingRadar } from './services/radarService';
import { initAuth, googleSignIn, logout } from './services/authService';
import { getCurrentCompetencia } from './services/currency';

// Components
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { CardsView } from './components/CardsView';
import { InstallmentsView } from './components/InstallmentsView';
import { PlanningView } from './components/PlanningView';
import { DebtsView } from './components/DebtsView';
import { PatrimonyView } from './components/PatrimonyView';
import { IntelligenceView } from './components/IntelligenceView';
import { RadarView } from './components/RadarView';
import { SimulatorView } from './components/SimulatorView';
import { ConciliationView } from './components/ConciliationView';
import { ReportsView } from './components/ReportsView';
import { AuditView } from './components/AuditView';
import { TestsRunnerView } from './components/TestsRunnerView';
import { SettingsView } from './components/SettingsView';
import { SheetsSyncModal } from './components/SheetsSyncModal';
import { QuickTransactionModal } from './components/QuickTransactionModal';

export default function App() {
  const [data, setData] = useState<StorageData>(() => storageService.getData());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentCompetencia, setCurrentCompetencia] = useState<string>(() => getCurrentCompetencia());
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Modals state
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);
  const [isSheetsSyncOpen, setIsSheetsSyncOpen] = useState(false);

  // Auth state
  const [user, setUser] = useState<User | null>(null);

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      setData({ ...storageService.getData() });
    });
    return unsubscribe;
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubAuth = initAuth(
      (currentUser) => setUser(currentUser),
      () => setUser(null)
    );
    return () => {
      if (typeof unsubAuth === 'function') unsubAuth();
    };
  }, []);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.error('Erro no login Google:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (err) {
      console.error('Erro no logout:', err);
    }
  };

  // Live calculations
  const summary = calculateFinancialSummary(
    data.accounts,
    data.cards,
    data.transactions,
    data.invoices,
    data.installments,
    data.debts,
    data.patrimony,
    data.investments,
    data.settings,
    currentCompetencia
  );

  const radarAlerts = runSpendingRadar(
    data.accounts,
    data.transactions,
    data.invoices,
    data.budgets,
    data.categories,
    data.debts
  );

  const openInvoicesCount = data.invoices.filter(
    (i) => i.status === 'ABERTA' || i.status === 'PARCIALMENTE_PAGA'
  ).length;

  return (
    <div className={`min-h-screen bg-[#EEF0F5] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200`}>
      {/* Executive Header */}
      <Header
        summary={summary}
        currentCompetencia={currentCompetencia}
        onCompetenciaChange={setCurrentCompetencia}
        onOpenQuickTx={() => setIsQuickTxOpen(true)}
        onOpenSheetsSync={() => setIsSheetsSyncOpen(true)}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          radarAlertCount={radarAlerts.length}
          openInvoiceCount={openInvoicesCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              categories={data.categories}
              transactions={data.transactions}
              invoices={data.invoices}
              cards={data.cards}
              debts={data.debts}
              radarAlerts={radarAlerts}
              currentCompetencia={currentCompetencia}
              onNavigate={setActiveTab}
              onQuickTx={() => setIsQuickTxOpen(true)}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={data.transactions}
              categories={data.categories}
              accounts={data.accounts}
              cards={data.cards}
              currentCompetencia={currentCompetencia}
              onAddTransaction={() => setIsQuickTxOpen(true)}
              onEditTransaction={(tx) => {
                const desc = prompt('Nova descrição:', tx.descricao);
                if (desc) {
                  storageService.updateTransaction(tx.id, { descricao: desc });
                }
              }}
              onDeleteTransaction={(txId, reason) => {
                storageService.deleteTransaction(txId, reason);
              }}
            />
          )}

          {activeTab === 'cards' && (
            <CardsView
              cards={data.cards}
              invoices={data.invoices}
              accounts={data.accounts}
              transactions={data.transactions}
              installments={data.installments}
              onPayInvoice={(invoiceId, contaId, valor) => {
                storageService.payInvoice(invoiceId, contaId, valor);
              }}
              onAddCard={(card) => {
                storageService.getData().cards.push({ ...card, id: `card-${Date.now()}` });
              }}
            />
          )}

          {activeTab === 'installments' && (
            <InstallmentsView
              installments={data.installments}
              cards={data.cards}
              accounts={data.accounts}
              onAddInstallment={(plan) => {
                storageService.getData().installments.push({ ...plan, id: `inst-${Date.now()}` });
              }}
            />
          )}

          {activeTab === 'planning' && (
            <PlanningView
              budgets={data.budgets}
              categories={data.categories}
              transactions={data.transactions}
              accounts={data.accounts}
              installments={data.installments}
              debts={data.debts}
              currentCompetencia={currentCompetencia}
              onUpdateBudget={(bgt) => {
                const idx = data.budgets.findIndex((b) => b.id === bgt.id);
                if (idx !== -1) {
                  data.budgets[idx] = bgt;
                }
              }}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsView
              debts={data.debts}
              onAddDebt={(debt) => {
                storageService.getData().debts.push({ ...debt, id: `debt-${Date.now()}` });
              }}
            />
          )}

          {activeTab === 'patrimony' && (
            <PatrimonyView
              patrimony={data.patrimony}
              investments={data.investments}
              goals={data.goals}
              summary={summary}
              onAddPatrimony={(item) => {
                storageService.getData().patrimony.push({ ...item, id: `pat-${Date.now()}` });
              }}
              onAddInvestment={(inv) => {
                storageService.getData().investments.push({ ...inv, id: `inv-${Date.now()}` });
              }}
              onAddGoal={(goal) => {
                storageService.getData().goals.push({ ...goal, id: `goal-${Date.now()}` });
              }}
            />
          )}

          {activeTab === 'goals' && (
            <PatrimonyView
              patrimony={data.patrimony}
              investments={data.investments}
              goals={data.goals}
              summary={summary}
              onAddPatrimony={(item) => {
                storageService.getData().patrimony.push({ ...item, id: `pat-${Date.now()}` });
              }}
              onAddInvestment={(inv) => {
                storageService.getData().investments.push({ ...inv, id: `inv-${Date.now()}` });
              }}
              onAddGoal={(goal) => {
                storageService.getData().goals.push({ ...goal, id: `goal-${Date.now()}` });
              }}
            />
          )}

          {activeTab === 'intelligence' && <IntelligenceView data={data} />}

          {activeTab === 'radar' && (
            <RadarView alerts={radarAlerts} onNavigate={setActiveTab} />
          )}

          {activeTab === 'simulator' && <SimulatorView />}

          {activeTab === 'conciliation' && (
            <ConciliationView
              accounts={data.accounts}
              categories={data.categories}
              existingTransactions={data.transactions}
              onImportTransactions={(imported) => {
                for (const item of imported) {
                  storageService.addTransaction(item, 'Importação de Extrato CSV');
                }
              }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              data={data}
              onOpenSheetsSync={() => setIsSheetsSyncOpen(true)}
            />
          )}

          {activeTab === 'audit' && <AuditView auditLogs={data.audit} />}

          {activeTab === 'tests' && <TestsRunnerView />}

          {activeTab === 'settings' && (
            <SettingsView
              settings={data.settings}
              data={data}
              onUpdateSettings={(newSettings) => storageService.updateSettings(newSettings)}
              onResetData={() => storageService.resetToDefault()}
            />
          )}
        </main>
      </div>

      {/* Floating Action Modals */}
      <SheetsSyncModal
        isOpen={isSheetsSyncOpen}
        onClose={() => setIsSheetsSyncOpen(false)}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        data={data}
        onUpdateSpreadsheetInfo={(id, url) => {
          storageService.updateSettings({
            sheetsSpreadsheetId: id,
            sheetsSpreadsheetUrl: url,
            lastSheetsSync: new Date().toISOString(),
          });
        }}
      />

      <QuickTransactionModal
        isOpen={isQuickTxOpen}
        onClose={() => setIsQuickTxOpen(false)}
        accounts={data.accounts}
        cards={data.cards}
        categories={data.categories}
        onSaveTransaction={(tx) => {
          storageService.addTransaction(tx, 'Inclusão rápida via modal');
        }}
      />
    </div>
  );
}
