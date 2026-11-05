import React, { useState, useEffect } from 'react';
import { Logo } from '../common/Logo';
import { LanguageToggle } from '../common/LanguageToggle';
import { useLanguage } from '../../i18n/LanguageContext';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';
import {
  UserPlus,
  Sparkles,
  CheckCircle,
  AlertCircle,
  LogIn,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

interface JoinPageProps {
  storeSlug?: string;
  onNavigateToRegister: () => void;
  onNavigateToLogin: (msg?: string) => void;
  onNavigateToForgotPassword: () => void;
}

export const JoinPage: React.FC<JoinPageProps> = ({
  storeSlug = 'noor',
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToForgotPassword,
}) => {
  const { showToast } = useToast();
  const { language, isRtl, t } = useLanguage();

  // Synchronously resolve company info without null state
  const resolveStoreInfo = (slug: string) => {
    try {
      const target = db.getSubscriberBySlug(slug);
      if (target) {
        return {
          id: target.id,
          store_name: target.store_name,
          store_slug: target.store_slug,
        };
      }
    } catch (e) {
      console.warn('Failed to resolve store slug, using default:', e);
    }
    return {
      id: 'NOOR',
      store_name: 'NOOR',
      store_slug: slug || 'noor',
    };
  };

  const [companyInfo, setCompanyInfo] = useState<{
    id: string;
    store_name: string;
    store_slug: string;
  }>(() => resolveStoreInfo(storeSlug));

  // Delegate Registration Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success State
  const [isSuccess, setIsSuccess] = useState(false);

  // Duplicate Account Error Modal (Rule 3.6)
  const [duplicateError, setDuplicateError] = useState<{
    show: boolean;
    reason: string;
  }>({ show: false, reason: '' });

  useEffect(() => {
    setCompanyInfo(resolveStoreInfo(storeSlug));
  }, [storeSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !phone.trim() || !email.trim() || !username.trim() || !password) {
      const msg = language === 'ar' ? 'يرجى ملء كافة حقول التسجيل المطلوبة' : 'Please fill all required registration fields';
      setFormError(msg);
      showToast(msg, 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await db.createDelegateRequest({
        store_slug: companyInfo?.store_slug || storeSlug,
        name,
        phone,
        email,
        username,
        password,
      });

      if (result.exists) {
        setDuplicateError({
          show: true,
          reason: result.reason || (language === 'ar' ? 'البيانات مسجلة مسبقاً' : 'Credentials already registered'),
        });
        return;
      }

      if (result.notFound) {
        const msg = language === 'ar' ? 'لم يتم العثور على الشركة المطلوبة' : 'Requested company not found';
        setFormError(msg);
        showToast(msg, 'danger');
        return;
      }

      if (result.success) {
        setIsSuccess(true);
        showToast(
          language === 'ar' ? 'تم تقديم طلب الانضمام بنجاح' : 'Join request submitted successfully',
          'success'
        );
      }
    } catch (err: any) {
      const msg = err?.message || (language === 'ar' ? 'حدث خطأ أثناء إرسال طلب الانضمام' : 'Error submitting join request');
      setFormError(msg);
      showToast(msg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rule 3.6: Duplicate Account Modal
  if (duplicateError.show) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-2xl max-w-md w-full p-8 text-center shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37] flex items-center justify-center mx-auto mb-4 text-[#D4AF37]">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h3 className="text-2xl font-black text-white mb-2">
            {language === 'ar' ? 'حسابك مسجل اصلا' : 'Account Already Exists'}
          </h3>
          <p className="text-sm text-[#A0A0A0] mb-8 leading-relaxed">
            {duplicateError.reason}.{' '}
            {language === 'ar'
              ? 'لا حاجة للتسجيل مرة أخرى كطلب جديد، بياناتك محفوظة في النظام.'
              : 'No need to register again as a new request; your data is safely stored in NOOR.'}
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => onNavigateToLogin()}
              className="w-full py-3.5 px-4 bg-[#D4AF37] hover:bg-[#b8972c] text-[#0A0A0A] font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              <span>{language === 'ar' ? '1. ادخل لحسابك' : '1. Sign in to your account'}</span>
            </button>

            <button
              onClick={onNavigateToForgotPassword}
              className="w-full py-3 px-4 bg-[#2A2A2A] hover:bg-[#333333] text-white font-medium text-sm rounded-xl border border-[#D4AF37]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-[#D4AF37]" />
              <span>{language === 'ar' ? '2. نسيت كلمة المرور' : '2. Forgot password?'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Request Submitted Successfully
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-[#1A1A1A] border-2 border-[#22C55E] rounded-2xl max-w-md w-full p-8 text-center shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-[#22C55E]/15 border border-[#22C55E] flex items-center justify-center mx-auto mb-4 text-[#22C55E]">
            <CheckCircle className="w-10 h-10" />
          </div>

          <h3 className="text-2xl font-black text-white mb-2">
            {language === 'ar' ? 'تم استلام طلب انضمامك بنجاح!' : 'Join Request Submitted Successfully!'}
          </h3>
          <p className="text-sm text-[#A0A0A0] mb-6 leading-relaxed">
            {language === 'ar' ? (
              <>
                طلبك الآن بانتظار موافقة صاحب شركة{' '}
                <strong className="text-[#D4AF37]">{companyInfo?.store_name}</strong>{' '}
                في ميزان الصلاحيات. بعد الموافقة ستتمكن من تسجيل الدخول مباشرة.
              </>
            ) : (
              <>
                Your request is now pending approval by{' '}
                <strong className="text-[#D4AF37]">{companyInfo?.store_name}</strong>{' '}
                in the Permissions Matrix. Once approved, you can log in immediately.
              </>
            )}
          </p>

          <button
            onClick={() => onNavigateToLogin('طلب انضمامك قيد المراجعة لدى صاحب الشركة')}
            className="w-full py-3.5 px-4 bg-[#D4AF37] hover:bg-[#b8972c] text-[#0A0A0A] font-black text-base rounded-xl transition-all cursor-pointer shadow-lg"
          >
            {language === 'ar' ? 'الذهاب لتسجيل الدخول' : 'Go to Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-10 px-4 flex flex-col justify-center items-center" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-lg">
        {/* أ. فوق الهيدر NOOR مع زر اللغة */}
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <LanguageToggle />
          <Logo size="md" showSubtitle={false} />

          <div className="inline-flex items-center gap-2 bg-[#1A1A1A] border border-[#D4AF37]/40 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>
              {language === 'ar' ? (
                <>تمت دعوتك للانضمام إلى شركة <span className="text-[#D4AF37] font-black">{companyInfo?.store_name || 'NOOR'}</span></>
              ) : (
                <>You are invited to join <span className="text-[#D4AF37] font-black">{companyInfo?.store_name || 'NOOR'}</span></>
              )}
            </span>
          </div>
        </div>

        {/* ب. البطاقة الأساسية الكبيرة */}
        <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <div className="border-b border-[#2A2A2A] pb-4 mb-6 text-center sm:text-start">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
              <UserPlus className="w-6 h-6 text-[#D4AF37]" />
              <span>
                {language === 'ar'
                  ? `انشئ حسابك كمندوب في شركة ${companyInfo?.store_name}`
                  : `Create Your Delegate Account in ${companyInfo?.store_name}`}
              </span>
            </h2>
            <p className="text-xs text-[#A0A0A0] mt-1">
              {language === 'ar' ? 'أدخل بياناتك للانضمام لفريق عمل المتجر' : 'Enter your details to join the store team'}
            </p>
          </div>

          {formError && (
            <div className="mb-4 p-3.5 bg-[#EF4444]/15 border border-[#EF4444] rounded-xl text-center text-[#EF4444] text-xs font-bold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. الاسم الكامل */}
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                {language === 'ar' ? 'الاسم الكامل' : 'Full Name'} <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={language === 'ar' ? 'الاسم الثلاثي' : 'Full Name'}
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2.5 px-3.5 text-xs outline-none"
              />
            </div>

            {/* 2. رقم الجوال */}
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                {language === 'ar' ? 'رقم الجوال' : 'Phone Number'} <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="tel"
                required
                dir="ltr"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2.5 px-3.5 text-xs outline-none font-mono text-left"
              />
            </div>

            {/* 3. البريد الإلكتروني */}
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="delegate@domain.com"
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2.5 px-3.5 text-xs outline-none font-mono text-left"
              />
            </div>

            {/* 4. اسم المستخدم للدخول */}
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                {language === 'ar' ? 'اسم المستخدم للدخول' : 'Login Username'} <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2.5 px-3.5 text-xs outline-none font-mono text-left"
              />
            </div>

            {/* 5. كلمة المرور */}
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                {language === 'ar' ? 'كلمة المرور' : 'Password'} <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2.5 px-3.5 text-xs outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[#D4AF37] hover:bg-[#b8972c] active:scale-[0.99] disabled:opacity-50 text-[#0A0A0A] font-black text-sm rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.25)] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? (language === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : (language === 'ar' ? 'انضم للشركة (انضمام)' : 'Join Company')}</span>
            </button>
            <p className="text-[11px] text-[#A0A0A0] text-center mt-2">
              {language === 'ar' 
                ? 'بعد التسجيل يروح طلبك لصاحب الشركة في ميزان الصلاحيات للموافقة' 
                : 'After registration, your request will be sent to the store owner in the Permissions Matrix for approval'}
            </p>
          </form>

          {/* روابط تسجيل الدخول السريعة */}
          <div className="mt-4 pt-3 border-t border-[#2A2A2A] text-center">
            <button
              type="button"
              onClick={() => onNavigateToLogin()}
              className="text-xs text-[#A0A0A0] hover:text-[#D4AF37] transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'لديك حساب بالفعل؟ سجل دخولك' : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* ج. فاصل واضح: أو */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2A2A2A]"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0A0A0A] px-4 text-xs font-black text-[#D4AF37] tracking-widest uppercase">
              {language === 'ar' ? 'أو' : 'OR'}
            </span>
          </div>
        </div>

        {/* د. البطاقة الثانوية الصغيرة الاحترافية (أصغر حجماً بزر أبيض وحدود ذهبية) */}
        <div className="bg-[#141414] border border-[#D4AF37]/40 hover:border-[#D4AF37] rounded-xl p-4 text-center shadow-md transition-all">
          <h3 className="text-xs sm:text-sm font-bold text-white mb-1">
            {language === 'ar' ? 'تبغى نسختك الخاصة؟' : 'Want your own store?'}
          </h3>
          <p className="text-[11px] sm:text-xs text-[#A0A0A0] mb-3 leading-relaxed">
            {language === 'ar'
              ? 'احصل على متجرك الخاص من NOOR مجاناً لمدة 30 يوم نسخة مستقلة تماماً باسمك'
              : 'Get your own NOOR store free for 30 days — a completely independent version in your name'}
          </p>
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="py-1.5 px-4 bg-white hover:bg-gray-100 text-[#0A0A0A] border-2 border-[#D4AF37] font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            {language === 'ar' ? 'احصل على متجرك الخاص' : 'Get Your Own Store'}
          </button>
        </div>
      </div>
    </div>
  );
};
