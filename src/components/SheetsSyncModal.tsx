import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CloudUpload,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  LogOut,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { StorageData } from '../services/storageService';
import { createFull32TabSpreadsheet, syncDataToGoogleSheets, ALL_32_SHEET_NAMES } from '../services/sheetsService';
import { uploadBackupToDrive } from '../services/driveService';

interface SheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  data: StorageData;
  onUpdateSpreadsheetInfo: (id: string, url: string) => void;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
  data,
  onUpdateSpreadsheetInfo,
}) => {
  const [spreadsheetId, setSpreadsheetId] = useState(data.settings.sheetsSpreadsheetId || '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(data.settings.sheetsSpreadsheetUrl || '');
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmSyncDialog, setConfirmSyncDialog] = useState(false);

  if (!isOpen) return null;

  const handleCreateSpreadsheet = async () => {
    setIsCreating(true);
    setStatusMessage('Criando planilha com as 32 abas no Google Sheets...');
    try {
      const res = await createFull32TabSpreadsheet();
      setSpreadsheetId(res.spreadsheetId);
      setSpreadsheetUrl(res.spreadsheetUrl);
      onUpdateSpreadsheetInfo(res.spreadsheetId, res.spreadsheetUrl);

      // Immediately sync initial data
      setStatusMessage('Povoando as 32 abas com cabeçalhos e lançamentos...');
      await syncDataToGoogleSheets(res.spreadsheetId, data);

      setStatusMessage('Planilha criada e sincronizada com sucesso no seu Google Drive!');
    } catch (err: unknown) {
      console.error(err);
      setStatusMessage(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleExecuteSync = async () => {
    setConfirmSyncDialog(false);
    if (!spreadsheetId) {
      alert('Crie ou informe o ID da planilha do Google Sheets primeiro.');
      return;
    }

    setIsSyncing(true);
    setStatusMessage('Atualizando todas as abas do Google Sheets...');
    try {
      await syncDataToGoogleSheets(spreadsheetId, data);
      setStatusMessage('Sincronização com o Google Sheets concluída com êxito!');
    } catch (err: unknown) {
      console.error(err);
      setStatusMessage(`Erro na sincronização: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBackupToDrive = async () => {
    setIsBackingUp(true);
    setStatusMessage('Enviando snapshot de backup para o Google Drive...');
    try {
      const res = await uploadBackupToDrive(data);
      setStatusMessage(`Backup salvo na pasta "Barbosa Fernandes - BF Finance OS Backups" no Google Drive (${res.fileName})!`);
    } catch (err: unknown) {
      console.error(err);
      setStatusMessage(`Erro ao fazer backup: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 max-w-xl w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Google Sheets & Drive — BF Finance OS
              </h3>
              <p className="text-xs text-slate-500">
                Integração oficial Workspace com permissão do usuário
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* User Auth Section */}
        {!user ? (
          <div className="p-5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Para sincronizar com as 32 abas do Google Sheets e salvar backups no Google Drive, conecte sua conta Google:
            </p>

            {/* Official Sign in with Google Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onLogin}
                className="flex items-center space-x-3 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-sm transition cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Conectar com Google</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected User Badge */}
            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {user.displayName || 'Usuário Conectado'}
                  </span>
                  <span className="text-[11px] text-slate-500">{user.email}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-xs text-rose-600 hover:underline font-semibold flex items-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </button>
            </div>

            {/* Current Spreadsheet Card */}
            {spreadsheetUrl ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Planilha Ativa no Google Sheets:
                </span>
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline break-all"
                >
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  <span>Abrir Planilha de 32 Abas no Google Sheets</span>
                </a>
                <span className="text-[10px] font-mono text-slate-400 block truncate">
                  ID: {spreadsheetId}
                </span>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 space-y-2">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                  Nenhuma planilha associada ainda
                </span>
                <p className="text-[11px] text-blue-800 dark:text-blue-300">
                  Clique abaixo para criar automaticamente uma planilha no seu Google Sheets com todas as 32 abas estruturadas e formatadas.
                </p>
                <button
                  onClick={handleCreateSpreadsheet}
                  disabled={isCreating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <FileSpreadsheet className={`w-4 h-4 ${isCreating ? 'animate-spin' : ''}`} />
                  <span>Criar Planilha Oficial (32 Abas)</span>
                </button>
              </div>
            )}

            {/* Sync & Backup Actions */}
            {spreadsheetId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmSyncDialog(true)}
                  disabled={isSyncing}
                  className="p-3 bg-[#0B2545] hover:bg-[#1F4E79] text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar com Google Sheets</span>
                </button>

                <button
                  onClick={handleBackupToDrive}
                  disabled={isBackingUp}
                  className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <CloudUpload className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
                  <span>Fazer Backup no Drive</span>
                </button>
              </div>
            )}

            {/* Status message */}
            {statusMessage && (
              <div className="p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-mono">
                {statusMessage}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal for Syncing (MANDATORY User Confirmation for Destructive/Mutating Operations) */}
        {confirmSyncDialog && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 space-y-3">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                  Confirmar Sincronização com o Google Sheets?
                </strong>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  Esta ação atualizará as 32 abas na sua planilha do Google Sheets com os dados mais recentes de contas, transações e orçamentos do BF Finance OS com sua permissão.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                onClick={() => setConfirmSyncDialog(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteSync}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow"
              >
                Confirmar Sincronização
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
