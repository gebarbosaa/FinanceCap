import React from 'react';
import { LogOut, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { User } from 'firebase/auth';

export const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
);

interface GoogleAuthButtonProps {
  onLogin: () => void;
  isLoading?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onLogin,
  isLoading = false,
  label = 'Entrar com Google',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs space-x-2',
    md: 'px-4 py-2 text-xs sm:text-sm space-x-2.5',
    lg: 'px-5 py-2.5 text-sm sm:text-base space-x-3',
  };

  return (
    <button
      type="button"
      onClick={onLogin}
      disabled={isLoading}
      aria-label="Entrar com conta Google"
      className={`inline-flex items-center justify-center font-semibold rounded-xl bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${sizeClasses[size]} ${className}`}
    >
      {isLoading ? (
        <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
      ) : (
        <GoogleLogo className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{isLoading ? 'Conectando...' : label}</span>
    </button>
  );
};

interface GoogleAccountCardProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSheetsSync?: () => void;
  className?: string;
}

export const GoogleAccountCard: React.FC<GoogleAccountCardProps> = ({
  user,
  onLogin,
  onLogout,
  onOpenSheetsSync,
  className = '',
}) => {
  if (!user) {
    return (
      <div
        className={`p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm space-y-4 ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-center">
              <GoogleLogo className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Autenticação Google Workspace
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acesse a sincronização de 32 abas no Google Sheets e backups no Drive.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            Desconectado
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-700/30 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1.5 border border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Escopos Solicitados com Segurança:</span>
          </div>
          <ul className="list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400 pl-1 space-y-0.5">
            <li>Google Sheets: gravação e sincronização das 32 abas financeiras</li>
            <li>Google Drive: backups seguros em formato JSON e snapshots</li>
          </ul>
        </div>

        <div>
          <GoogleAuthButton onLogin={onLogin} label="Entrar com Google" size="md" className="w-full sm:w-auto" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-800 shadow-sm space-y-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Usuário Google'}
              className="w-12 h-12 rounded-full border-2 border-emerald-500 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-lg flex items-center justify-center border-2 border-emerald-500">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {user.displayName || 'Usuário Barbosa Fernandes'}
              </h4>
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                <span>Google Autenticado</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {onOpenSheetsSync && (
            <button
              type="button"
              onClick={onOpenSheetsSync}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
            >
              Gerenciar 32 Abas
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 dark:bg-slate-700 dark:hover:bg-rose-950/40 dark:text-slate-200 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-600 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Desconectar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center space-x-2">
          <GoogleLogo className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[11px]">
            <strong>Provedor:</strong> Google Identity (OAuth 2.0)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span className="text-[11px]">
            <strong>Tokens:</strong> Em memória protegida (sem persistência em disco)
          </span>
        </div>
      </div>
    </div>
  );
};
