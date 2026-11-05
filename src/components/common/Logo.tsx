import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const { language } = useLanguage();

  const circleSizes = {
    sm: 'w-10 h-10 text-sm border-2',
    md: 'w-14 h-14 text-base border-2',
    lg: 'w-20 h-20 text-xl border-[3px]',
    xl: 'w-28 h-28 text-3xl border-4',
  };

  const titleSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const subtitleSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Circle with CR7 inside */}
      <div
        className={`${circleSizes[size]} rounded-full bg-[#0A0A0A] border-[#D4AF37] flex items-center justify-center font-black tracking-widest text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] transition-transform duration-300 hover:scale-105`}
        title="NOOR"
      >
        <span className="font-extrabold font-mono">CR7</span>
      </div>

      {/* Name and Subtitle */}
      <div className="mt-2 text-center">
        <h1 className={`${titleSizes[size]} font-black tracking-wider text-[#D4AF37] leading-none`}>
          NOOR
        </h1>
        {showSubtitle && (
          <p className={`${subtitleSizes[size]} text-[#A0A0A0] mt-1 font-medium`}>
            {language === 'ar' ? 'نظام حسابات وادارة اعمال' : 'Accounting & Business Management'}
          </p>
        )}
      </div>
    </div>
  );
};
