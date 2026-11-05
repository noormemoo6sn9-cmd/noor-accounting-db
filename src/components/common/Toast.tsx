import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'danger' | 'warning' | 'info';

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString();
    setToast({ id, message, type });

    setTimeout(() => {
      setToast(current => (current?.id === id ? null : current));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none bg-black/40 backdrop-blur-[2px] transition-all duration-300">
          <div
            className={`pointer-events-auto max-w-md w-full bg-[#1A1A1A] border-2 rounded-xl p-5 shadow-2xl text-center transform scale-100 transition-all ${
              toast.type === 'success'
                ? 'border-[#22C55E]/80 shadow-[#22C55E]/10'
                : toast.type === 'danger'
                ? 'border-[#EF4444]/80 shadow-[#EF4444]/10'
                : toast.type === 'warning'
                ? 'border-[#F59E0B]/80 shadow-[#F59E0B]/10'
                : 'border-[#D4AF37]/80 shadow-[#D4AF37]/10'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-3">
              {toast.type === 'success' && <CheckCircle2 className="w-10 h-10 text-[#22C55E]" />}
              {toast.type === 'danger' && <XCircle className="w-10 h-10 text-[#EF4444]" />}
              {toast.type === 'warning' && <AlertTriangle className="w-10 h-10 text-[#F59E0B]" />}
              {toast.type === 'info' && <Info className="w-10 h-10 text-[#D4AF37]" />}

              <p className="text-lg font-bold text-white text-center leading-relaxed">
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
