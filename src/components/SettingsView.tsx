import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Download,
  Upload,
  ShieldAlert,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import { SystemSettings } from '../types/finance';
import { formatCurrency } from '../services/currency';
import { storageService, StorageData } from '../services/storageService';

import { User } from 'firebase/auth';
import { GoogleAccountCard } from './GoogleAuthButton';

interface SettingsViewProps {
  settings: SystemSettings;
  data: StorageData;
  onUpdateSettings: (settings: Partial<SystemSettings>) => void;
  onResetData: () => void;
  user?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onOpenSheetsSync?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  data,
  onUpdateSettings,
  onResetData,
  user = null,
  onLogin = () => {},
  onLogout = () => {},
  onOpenSheetsSync = () => {},
}) => {
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDownloadBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BF_Finance_OS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.accounts && parsed.transactions) {
          if (confirm('Deseja restaurar este backup? Todos os dados atuais serão substituídos pelo arquivo.')) {
            storageService.importData(parsed, 'Restauração manual de arquivo de backup JSON');
            alert('Backup restaurado com sucesso!');
            window.location.reload();
          }
        } else {
          alert('Arquivo JSON inválido. Estrutura do BF Finance OS não identificada.');
        }
      } catch (err) {
        alert('Erro ao processar arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>Configurações & Parâmetros do Sistema (Aba 1)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Parâmetros de moeda, fuso horário, reserva de emergência e governança de dados.
          </p>
        </div>

        {saveSuccess && (
          <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200">
            <CheckCircle className="w-4 h-4" />
            <span>Salvo com Sucesso!</span>
          </span>
        )}
      </div>

      {/* Google Authentication & Workspace Integration Card */}
      <GoogleAccountCard
        user={user}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenSheetsSync={onOpenSheetsSync}
      />

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome do Sistema:
            </label>
            <input
              type="text"
              value={formData.nomeSistema}
              onChange={(e) => setFormData({ ...formData, nomeSistema: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome do Proprietário / Gestor:
            </label>
            <input
              type="text"
              value={formData.nomeProprietario}
              onChange={(e) => setFormData({ ...formData, nomeProprietario: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Moeda:
            </label>
            <input
              type="text"
              disabled
              value={`${formData.moeda} (Real Brasileiro - R$ 1.234,56)`}
              className="w-full p-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Fuso Horário Obrigatório:
            </label>
            <input
              type="text"
              disabled
              value={`${formData.fusoHorario} (São Paulo)`}
              className="w-full p-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Meta Reserva de Emergência (R$):
            </label>
            <input
              type="number"
              value={formData.reservaEmergenciaMetaCentavos / 100}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reservaEmergenciaMetaCentavos: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alerta de Vencimento de Fatura (Dias de antecedência):
            </label>
            <input
              type="number"
              value={formData.alertaVencimentoDias}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  alertaVencimentoDias: parseInt(e.target.value, 10) || 5,
                })
              }
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#0B2545] hover:bg-[#1F4E79] text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </form>

      {/* Backup and Restore Box */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
          Exportação, Backup e Restauração
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 space-y-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Download de Backup Local (JSON)
            </span>
            <p className="text-[11px] text-slate-500">
              Exporta snapshot íntegro de todas as contas, lançamentos, cartões e auditoria.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo JSON</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 space-y-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Restaurar Base de Backup (JSON)
            </span>
            <p className="text-[11px] text-slate-500">
              Carrega arquivo previamente exportado restaurando todos os dados.
            </p>
            <label className="flex items-center space-x-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl transition cursor-pointer w-fit">
              <Upload className="w-3.5 h-3.5" />
              <span>Selecionar Arquivo</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Danger zone */}
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block">
              Redefinir Base para Padrão Barbosa Fernandes
            </span>
            <p className="text-[11px] text-rose-600 dark:text-rose-400">
              Restaura as contas, cartões e lançamentos padrão do modelo BF Finance OS.
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm('Tem certeza de que deseja restaurar a base padrão de demonstração?')) {
                onResetData();
              }
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition flex-shrink-0"
          >
            Restaurar Base Padrão
          </button>
        </div>
      </div>
    </div>
  );
};
