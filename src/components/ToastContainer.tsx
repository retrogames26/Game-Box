import React from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';

export const ToastContainer: React.FC = () => {
  const { toasts } = useArcade();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-cyan-500/40 text-cyan-200 bg-slate-950/95';
        let icon = <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />;

        if (toast.type === 'success') {
          borderClass = 'border-emerald-500/50 text-emerald-200 bg-slate-950/95 shadow-lg shadow-emerald-500/10';
          icon = <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-500/50 text-amber-200 bg-slate-950/95 shadow-lg shadow-amber-500/10';
          icon = <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />;
        } else if (toast.type === 'error') {
          borderClass = 'border-rose-500/50 text-rose-200 bg-slate-950/95 shadow-lg shadow-rose-500/10';
          icon = <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />;
        }

        return (
          <div
            key={toast.id}
            className={`p-3.5 rounded-2xl border ${borderClass} flex items-start gap-2.5 text-xs font-semibold shadow-2xl backdrop-blur-md animate-fade-in pointer-events-auto`}
          >
            {icon}
            <span className="flex-1 leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
