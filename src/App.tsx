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
import { AccountsView } from './components/AccountsView';
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
import { CategoriesView } from './components/CategoriesView';
import { SheetsSyncModal } from './components/SheetsSyncModal';
import { QuickTransactionModal } from './components/QuickTransactionModal';
import { WaterTracker } from './components/WaterTracker';

export default function App() {
  const [data, setData] = useState<StorageData>(() => storageService.getData());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentCompetencia, setCurrentCompetencia] = useState<string>(() => getCurrentCompetencia());
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('bf-finance-theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  // Modals state
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);
  const [isSheetsSyncOpen, setIsSheetsSyncOpen] = useState(false);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      setData({ ...storageService.getData() });
      setCloudError(storageService.getCloudSyncError());
    });
    return unsubscribe;
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubAuth = initAuth(
      (currentUser) => {
        setUser(currentUser);
        setAuthReady(true);
        setCloudReady(false);
        setCloudError(null);
        void storageService.connectCloud(currentUser.uid)
          .then(() => setCloudReady(true))
          .catch((error: unknown) => {
            setCloudError(error instanceof Error ? error.message : 'Não foi possível conectar ao Firestore.');
            setCloudReady(false);
          });
      },
      () => {
        storageService.disconnectCloud();
        setUser(null);
        setAuthReady(true);
        setCloudReady(false);
        setCloudError(null);
      }
    );
    return () => {
      if (typeof unsubAuth === 'function') unsubAuth();
    };
  }, []);

  // Apply and persist the user's explicit theme choice.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    localStorage.setItem('bf-finance-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser(res.user);
        setCloudReady(false);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error('Erro no login Google:', err);
      alert('Falha ao autenticar com a conta Google. Por favor, tente novamente.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      storageService.disconnectCloud();
      setUser(null);
      setCloudReady(false);
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

  if (!authReady || (user && !cloudReady && !cloudError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-9 w-9 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Conectando ao BF Finance OS...</p>
          <p className="text-xs text-slate-500">Verificando sua conta e sincronizando seus dados.</p>
        </div>
      </div>
    );
  }

  if (!user || !cloudReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl space-y-5 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl font-black">BF</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">BF Finance OS</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Entre com sua conta Google para acessar e sincronizar seus dados financeiros com segurança.</p>
          </div>
          {cloudError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 p-3 text-left text-xs text-rose-700 dark:text-rose-300">
              <strong>Não foi possível conectar ao banco de dados.</strong>
              <p className="mt-1 break-words">{cloudError}</p>
              <p className="mt-2">Confirme se o Cloud Firestore foi criado no projeto Firebase correto e se o provedor Google está habilitado em Authentication.</p>
            </div>
          )}
          <button onClick={handleLogin} className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-orange-500 dark:hover:bg-orange-600 text-white py-3 px-4 text-sm font-bold transition">
            Continuar com Google
          </button>
          <p className="text-[11px] text-slate-400">Seus lançamentos serão associados ao seu usuário Google e sincronizados entre seus dispositivos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bf-app min-h-screen flex flex-col font-sans transition-colors duration-200`}>
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

      {cloudError && cloudReady && (
        <div className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          <strong>Falha na sincronização com a nuvem:</strong> {cloudError} Seus dados locais foram mantidos; verifique a conexão antes de continuar lançando informações.
        </div>
      )}

      <div className="flex min-w-0 flex-1">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          radarAlertCount={radarAlerts.length}
          openInvoiceCount={openInvoicesCount}
          darkMode={darkMode}
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onOpenSheetsSync={() => setIsSheetsSyncOpen(true)}
        />

        {/* Main Content Area */}
        <main className="bf-main min-w-0 flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto overflow-x-hidden">
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
              user={user}
              onLogin={handleLogin}
              onOpenSheetsSync={() => setIsSheetsSyncOpen(true)}
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
              invoices={data.invoices}
              onSaveEdit={(txId, updates) => {
                storageService.updateTransaction(txId, updates);
              }}
              onDeleteTransaction={(txId, reason) => {
                storageService.deleteTransaction(txId, reason);
              }}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              accounts={data.accounts}
              onAddAccount={(account) => storageService.addAccount(account)}
            />
          )}

          {activeTab === 'cards' && (
            <CardsView
              cards={data.cards}
              categories={data.categories}
              invoices={data.invoices}
              accounts={data.accounts}
              transactions={data.transactions}
              installments={data.installments}
              onPayInvoice={(invoiceId, contaId, valor) => {
                return storageService.payInvoice(invoiceId, contaId, valor);
              }}
              onAddCard={(card) => {
                storageService.addCard(card);
              }}
            />
          )}

          {activeTab === 'installments' && (
            <InstallmentsView
              installments={data.installments}
              cards={data.cards}
              categories={data.categories}
              onAddInstallment={(plan, categoryId) => {
                storageService.addInstallmentPurchase(plan, categoryId);
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
              recurrences={data.recurrences}
              currentCompetencia={currentCompetencia}
              onUpdateBudget={(bgt) => storageService.upsertBudget(bgt)}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsView
              debts={data.debts}
              onAddDebt={(debt) => {
                storageService.addDebt(debt);
              }}
            />
          )}

          {activeTab === 'patrimony' && (
            <PatrimonyView
              initialTab="BALANCO"
              patrimony={data.patrimony}
              investments={data.investments}
              goals={data.goals}
              summary={summary}
              onAddPatrimony={(item) => {
                storageService.addPatrimony(item);
              }}
              onAddInvestment={(inv) => {
                storageService.addInvestment(inv);
              }}
              onAddGoal={(goal) => {
                storageService.addGoal(goal);
              }}
            />
          )}

          {activeTab === 'goals' && (
            <PatrimonyView
              initialTab="METAS"
              patrimony={data.patrimony}
              investments={data.investments}
              goals={data.goals}
              summary={summary}
              onAddPatrimony={(item) => {
                storageService.addPatrimony(item);
              }}
              onAddInvestment={(inv) => {
                storageService.addInvestment(inv);
              }}
              onAddGoal={(goal) => {
                storageService.addGoal(goal);
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

          {activeTab === 'categories' && (
            <CategoriesView
              categories={data.categories}
              transactions={data.transactions}
              onAdd={(category) => storageService.addCategory(category)}
              onUpdate={(id, updates) => storageService.updateCategory(id, updates)}
              onArchive={(id) => storageService.archiveCategory(id)}
            />
          )}

          {activeTab === 'water' && (
            <WaterTracker
              entries={data.waterEntries}
              dailyGoalMl={data.settings.waterGoalMl || 2000}
              onAdd={(amountMl, date) => storageService.addWaterIntake(amountMl, date)}
              onDelete={(id) => storageService.deleteWaterIntake(id)}
              onGoalChange={(waterGoalMl) => storageService.updateSettings({ waterGoalMl })}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={data.settings}
              data={data}
              onUpdateSettings={(newSettings) => storageService.updateSettings(newSettings)}
              onResetData={() => storageService.resetToDefault()}
              user={user}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onOpenSheetsSync={() => setIsSheetsSyncOpen(true)}
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
