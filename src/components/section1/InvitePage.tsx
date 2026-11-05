import React from 'react';
import { Logo } from '../common/Logo';
import { LanguageToggle } from '../common/LanguageToggle';
import { useLanguage } from '../../i18n/LanguageContext';
import { Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';

interface InvitePageProps {
  onNavigateToRegister: () => void;
}

export const InvitePage: React.FC<InvitePageProps> = ({ onNavigateToRegister }) => {
  const { language, isRtl } = useLanguage();

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Subtle royal background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10">
        {/* Top Header with Language Toggle & Logo */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <LanguageToggle />
          <Logo size="lg" showSubtitle={true} />
        </div>

        {/* The Card */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 sm:p-10 shadow-2xl shadow-black/80 text-center relative">
          {/* Gold accent line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 leading-tight">
            {language === 'ar' ? (
              <>احصل على متجرك الخاص في <span className="text-[#D4AF37]">NOOR</span></>
            ) : (
              <>Get Your Own Business Store on <span className="text-[#D4AF37]">NOOR</span></>
            )}
          </h2>

          {/* Text */}
          <p className="text-[#A0A0A0] text-base sm:text-lg mb-8 leading-relaxed">
            {language === 'ar'
              ? 'احصل على نظام حسابات NOOR الخاص بشركتك مجانا لمدة 30 يوم'
              : 'Get your private NOOR business management & accounting system free for 30 days'}
          </p>

          {/* Big Golden Button */}
          <button
            onClick={onNavigateToRegister}
            className="w-full py-4 px-6 bg-[#D4AF37] hover:bg-[#b8972c] active:scale-[0.99] text-[#0A0A0A] font-black text-lg rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.3)] transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group"
          >
            <span>
              {language === 'ar' ? 'انشئ متجرك الخاص الان' : 'Create Your Store Now'}
            </span>
            {isRtl ? (
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            ) : (
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            )}
          </button>

          {/* Line under button */}
          <p className="text-xs sm:text-sm text-[#A0A0A0] mt-5 font-medium tracking-wide">
            {language === 'ar' ? 'لاصحاب المحلات والموزعين فقط' : 'For business owners and distributors only'}
          </p>

          {/* Note in footer */}
          <div className="mt-8 pt-6 border-t border-[#2A2A2A]/60 flex items-center justify-center gap-2 text-xs text-[#A0A0A0]/70">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>
              {language === 'ar'
                ? 'رابط الدعوة المعتمد: invite/NOOR'
                : 'Approved invitation link: invite/NOOR'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
