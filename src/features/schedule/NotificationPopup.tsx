import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export default function Notification({ message, type = 'error', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000); // Auto-hide after 5s
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    error: "bg-rose-50 border-rose-100 text-rose-600",
    success: "bg-emerald-50 border-emerald-100 text-emerald-600"
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border mb-4 animate-in slide-in-from-top-4 duration-300 ${styles[type]}`}>
      <div className="flex items-center gap-3">
        {type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
        <p className="text-xs font-black uppercase tracking-tight">{message}</p>
      </div>
      <button onClick={onClose} className="hover:opacity-70">
        <X size={16} />
      </button>
    </div>
  );
}