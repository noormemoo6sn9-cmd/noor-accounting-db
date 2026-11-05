import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center bg-[#151515] border border-[#2A2A2A] rounded-xl p-0.5 shadow-sm text-xs ${className}`}
      dir="ltr"
    >
      <div className="flex items-center px-1.5 text-[#D4AF37]">
        <Globe className="w-3.5 h-3.5" />
      </div>

      {/* Arabic Button */}
      <button
        type="button"
        onClick={() => setLanguage('ar')}
        aria-label="التبديل إلى اللغة العربية"
        className={`py-1 px-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
          language === 'ar'
            ? 'bg-[#D4AF37] text-[#0A0A0A] shadow-md font-black'
            : 'text-[#A0A0A0] hover:text-white hover:bg-[#222222]'
        }`}
      >
        عربي
      </button>

      {/* English Button */}
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-label="Switch to English"
        className={`py-1 px-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-[#D4AF37] text-[#0A0A0A] shadow-md font-black'
            : 'text-[#A0A0A0] hover:text-white hover:bg-[#222222]'
        }`}
      >
        English
      </button>
    </div>
  );
};
