import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in NOOR application:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/join/noor';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4" dir="rtl">
          <div className="bg-[#1A1A1A] border-2 border-[#EF4444] rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#EF4444]/15 border border-[#EF4444] flex items-center justify-center mx-auto mb-4 text-[#EF4444]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-white mb-2">
              حدث خطأ أثناء تحميل الصفحة
            </h3>

            <p className="text-xs text-[#A0A0A0] mb-4 leading-relaxed">
              تم رصد الخطأ التالي ولن تظهر شاشة سوداء أبداً:
            </p>

            <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-3 mb-6 text-xs text-[#EF4444] font-mono text-start overflow-x-auto max-h-32">
              {this.state.error?.message || 'خطأ غير محدد'}
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#b8972c] text-[#0A0A0A] font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل صفحة المندوبين (/join/noor)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="w-full py-2 bg-[#2A2A2A] hover:bg-[#333333] text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
