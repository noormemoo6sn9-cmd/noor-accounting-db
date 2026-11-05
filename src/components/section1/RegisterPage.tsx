import React, { useState, useEffect } from 'react';
import { Logo } from '../common/Logo';
import { LanguageToggle } from '../common/LanguageToggle';
import { useLanguage } from '../../i18n/LanguageContext';
import { db, getWhatsAppUrl } from '../../services/db';
import { ActivityType, PlanDuration, Subscriber } from '../../types';
import { useToast } from '../common/Toast';
import { 
  CheckCircle, 
  AlertCircle, 
  Send, 
  ShieldCheck, 
  LogIn, 
  KeyRound, 
  MessageCircle, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  MapPin, 
  Clock, 
  HelpCircle,
  Timer
} from 'lucide-react';

interface RegisterPageProps {
  onNavigateToLogin: (initialMessage?: string) => void;
  onNavigateToForgotPassword: () => void;
  onNavigateToInvite?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateToLogin,
  onNavigateToForgotPassword,
}) => {
  const { showToast } = useToast();
  const { language, isRtl, t } = useLanguage();

  // 10 Form Fields in exact order
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('محل خردوات');
  const [city, setCity] = useState('');
  const [planDuration, setPlanDuration] = useState<PlanDuration>('شهر');
  const [heardFrom, setHeardFrom] = useState('');

  // OTP States
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpTimer, setPhoneOtpTimer] = useState(300);

  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpTimer, setEmailOtpTimer] = useState(300);

  // Verification code display modal (real simulation)
  const [activeOtpModal, setActiveOtpModal] = useState<{
    type: 'phone' | 'email';
    target: string;
    code: string;
  } | null>(null);

  // Existing account prompt (Rule 3.6)
  const [duplicateAccountError, setDuplicateAccountError] = useState<{
    show: boolean;
    reason: string;
  }>({ show: false, reason: '' });

  // Creation Success State (Auto-Approved)
  const [createdSubscriber, setCreatedSubscriber] = useState<Subscriber | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timers for OTP
  useEffect(() => {
    let timer: any;
    if (phoneOtpSent && phoneOtpTimer > 0 && !phoneVerified) {
      timer = setInterval(() => setPhoneOtpTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [phoneOtpSent, phoneOtpTimer, phoneVerified]);

  useEffect(() => {
    let timer: any;
    if (emailOtpSent && emailOtpTimer > 0 && !emailVerified) {
      timer = setInterval(() => setEmailOtpTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [emailOtpSent, emailOtpTimer, emailVerified]);

  // Check duplicate on blur
  const checkDuplicate = (value: string) => {
    if (!value || value.trim().length < 3) return;
    const check = db.checkAccountExists(value);
    if (check.exists) {
      setDuplicateAccountError({
        show: true,
        reason:
          check.field === 'email'
            ? 'البريد الالكتروني مسجل مسبقاً'
            : check.field === 'phone'
            ? 'رقم الجوال مسجل مسبقاً'
            : 'اسم المستخدم مسجل مسبقاً',
      });
    }
  };

  // Trigger Phone OTP
  const handleSendPhoneOtp = () => {
    if (!phone || phone.trim().length < 9) {
      showToast('يرجى ادخال رقم جوال صحيح أولاً', 'warning');
      return;
    }
    const check = db.checkAccountExists(phone);
    if (check.exists) {
      setDuplicateAccountError({ show: true, reason: 'رقم الجوال مسجل مسبقاً' });
      return;
    }
    const code = db.generateOTP(phone.trim(), 'phone');
    setPhoneOtpSent(true);
    setPhoneOtpTimer(300);
    setActiveOtpModal({ type: 'phone', target: phone.trim(), code });
    showToast('تم إرسال رمز التحقق OTP إلى الجوال', 'info');
  };

  const handleVerifyPhoneOtp = () => {
    if (db.verifyOTP(phone.trim(), phoneOtp)) {
      setPhoneVerified(true);
      setActiveOtpModal(null);
      showToast('تم التحقق من رقم الجوال بنجاح', 'success');
    } else {
      showToast('رمز تحقق الجوال غير صحيح أو منتهي الصلاحية', 'danger');
    }
  };

  // Trigger Email OTP
  const handleSendEmailOtp = () => {
    if (!email || !email.includes('@')) {
      showToast('يرجى ادخال بريد الكتروني صحيح أولاً', 'warning');
      return;
    }
    const check = db.checkAccountExists(email);
    if (check.exists) {
      setDuplicateAccountError({ show: true, reason: 'البريد الالكتروني مسجل مسبقاً' });
      return;
    }
    const code = db.generateOTP(email.trim(), 'email');
    setEmailOtpSent(true);
    setEmailOtpTimer(300);
    setActiveOtpModal({ type: 'email', target: email.trim(), code });
    showToast('تم إرسال رمز التحقق OTP إلى البريد الإلكتروني', 'info');
  };

  const handleVerifyEmailOtp = () => {
    if (db.verifyOTP(email.trim(), emailOtp)) {
      setEmailVerified(true);
      setActiveOtpModal(null);
      showToast('تم التحقق من البريد الإلكتروني بنجاح', 'success');
    } else {
      showToast('رمز تحقق البريد الإلكتروني غير صحيح أو منتهي الصلاحية', 'danger');
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation
    if (!storeName.trim()) {
      showToast('يرجى إدخال اسم المحل / الشركة', 'warning');
      return;
    }
    if (!ownerName.trim()) {
      showToast('يرجى إدخال اسم صاحب المحل', 'warning');
      return;
    }
    if (!phoneVerified) {
      showToast('يرجى إتمام التحقق من رقم الجوال برمز OTP', 'warning');
      return;
    }
    if (!emailVerified) {
      showToast('يرجى إتمام التحقق من البريد الإلكتروني برمز OTP', 'warning');
      return;
    }
    if (!username.trim()) {
      showToast('يرجى إدخال اسم المستخدم', 'warning');
      return;
    }
    if (!password) {
      showToast('يرجى إدخال كلمة المرور', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('كلمة المرور وتأكيدها غير متطابقين', 'danger');
      return;
    }
    if (!city.trim()) {
      showToast('يرجى إدخال المدينة', 'warning');
      return;
    }

    // Check duplicate once more before creation
    const checkUsername = db.checkAccountExists(username);
    if (checkUsername.exists) {
      setDuplicateAccountError({ show: true, reason: 'اسم المستخدم مسجل مسبقاً' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Auto-Approve without waiting
      const result = await db.createSubscriber({
        store_name: storeName,
        owner_name: ownerName,
        phone,
        email,
        username,
        password,
        activity_type: activityType,
        city,
        plan_duration: planDuration,
        heard_from: heardFrom,
      });

      setCreatedSubscriber(result.subscriber);
      showToast('مبروك! تم تفعيل متجرك في NOOR بنجاح', 'success');
    } catch (err) {
      showToast('حدث خطأ أثناء إنشاء الحساب', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Rule 3.6 Modal: "حسابك مسجل اصلا"
  if (duplicateAccountError.show) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-2xl max-w-md w-full p-8 text-center shadow-2xl shadow-black relative animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37] flex items-center justify-center mx-auto mb-4 text-[#D4AF37]">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h3 className="text-2xl font-black text-white mb-2">
            حسابك مسجل اصلا
          </h3>
          <p className="text-sm text-[#A0A0A0] mb-8 leading-relaxed">
            {duplicateAccountError.reason}. لا حاجة للتسجيل مجدداً، حسابك وبياناتك محفوظة في NOOR.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => onNavigateToLogin()}
              className="w-full py-3.5 px-4 bg-[#D4AF37] hover:bg-[#b8972c] text-[#0A0A0A] font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              <span>1. ادخل لحسابك</span>
            </button>

            <button
              onClick={() => onNavigateToForgotPassword()}
              className="w-full py-3 px-4 bg-[#2A2A2A] hover:bg-[#333333] text-white font-medium text-sm rounded-xl border border-[#D4AF37]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-[#D4AF37]" />
              <span>2. نسيت كلمة المرور</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Auto-Approve Success Dialog (WhatsApp trigger + redirect)
  if (createdSubscriber) {
    const storeDomain = `noor.com/store/${createdSubscriber.store_slug}`;
    const whatsappMessage = `مبروك تم تفعيل متجرك في NOOR\nرابط متجرك: ${storeDomain}\nاسم المستخدم: ${createdSubscriber.username}\nرقم اشتراكك: ${createdSubscriber.subscription_id}\nينتهي بعد 30 يوم`;
    const whatsappUrl = getWhatsAppUrl(createdSubscriber.phone, whatsappMessage);

    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="bg-[#1A1A1A] border-2 border-[#22C55E] rounded-2xl max-w-lg w-full p-8 text-center shadow-2xl relative">
          <div className="w-16 h-16 rounded-full bg-[#22C55E]/10 border border-[#22C55E] flex items-center justify-center mx-auto mb-4 text-[#22C55E]">
            <CheckCircle className="w-10 h-10" />
          </div>

          <h3 className="text-2xl font-black text-white mb-2">
            مبروك تم تفعيل متجرك في NOOR
          </h3>
          <p className="text-sm text-[#A0A0A0] mb-6">
            تم إنشاء متجرك الخاص بنسخة نظيفة فاضية لمدة 30 يوم مجاناً
          </p>

          {/* Details Card */}
          <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-5 mb-6 text-right space-y-3">
            <div className="flex justify-between items-center text-sm border-b border-[#2A2A2A]/50 pb-2">
              <span className="text-[#A0A0A0]">رقم اشتراكك:</span>
              <span className="font-mono font-bold text-[#D4AF37]">{createdSubscriber.subscription_id}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-[#2A2A2A]/50 pb-2">
              <span className="text-[#A0A0A0]">رابط متجرك:</span>
              <span className="font-mono text-white text-xs">{storeDomain}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-[#2A2A2A]/50 pb-2">
              <span className="text-[#A0A0A0]">اسم المستخدم:</span>
              <span className="font-bold text-white">{createdSubscriber.username}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#A0A0A0]">المدة المجانية:</span>
              <span className="text-[#22C55E] font-bold">30 يوم مجاناً</span>
            </div>
          </div>

          {/* WhatsApp Semi-Automatic Button */}
          <div className="space-y-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-[#22C55E] hover:bg-[#1ea34d] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <MessageCircle className="w-5 h-5" />
              <span>إرسال تفاصيل التفعيل عبر واتساب</span>
            </a>

            <button
              onClick={() => onNavigateToLogin('مبروك تم تفعيل متجرك سجل دخولك الحين')}
              className="w-full py-3.5 px-4 bg-[#D4AF37] hover:bg-[#b8972c] text-[#0A0A0A] font-black text-base rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              <span>سجل دخولك الحين</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-12 px-4 flex flex-col justify-center items-center" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-2xl">
        {/* Header with LanguageToggle before Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <LanguageToggle />
          <Logo size="md" showSubtitle={true} />
        </div>

        {/* Form Container */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 sm:p-10 shadow-2xl">
          <div className="border-b border-[#2A2A2A] pb-5 mb-8 text-center sm:text-start">
            <h2 className="text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
              <Building2 className="w-6 h-6 text-[#D4AF37]" />
              <span>{t('registerTitle', 'إنشاء حساب مشترك جديد للتاجر')}</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#A0A0A0] mt-1.5">
              {t('registerSubtitle', 'احصل على نسختك المستقلة الخاصة بمتجرك لمدة 30 يوم مجاناً - تفعيل فوري تلقائي')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. اسم المحل / الشركة */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                1. اسم المحل / الشركة <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-white rounded-xl py-3 px-4 outline-none transition-colors"
                  placeholder="اكتب اسم متجرك أو شركتك"
                />
              </div>
            </div>

            {/* 2. اسم صاحب المحل */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                2. اسم صاحب المحل <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-white rounded-xl py-3 px-4 outline-none transition-colors"
                  placeholder="الاسم الثلاثي أو الثنائي لصاحب المحل"
                />
              </div>
            </div>

            {/* 3. رقم الجوال + تحقق OTP حقيقي */}
            <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
              <label className="block text-sm font-semibold text-white mb-2">
                3. رقم الجوال + تحقق OTP حقيقي <span className="text-[#EF4444]">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={phone}
                    disabled={phoneVerified}
                    onChange={e => setPhone(e.target.value)}
                    onBlur={() => checkDuplicate(phone)}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-3 px-4 outline-none text-left font-mono disabled:opacity-60"
                    placeholder="9665xxxxxxxx أو 05xxxxxxxx"
                  />
                </div>
                {!phoneVerified ? (
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    className="py-3 px-5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border border-[#D4AF37] text-[#D4AF37] font-bold text-sm rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>إرسال كود الجوال</span>
                  </button>
                ) : (
                  <div className="py-3 px-4 bg-[#22C55E]/10 border border-[#22C55E] text-[#22C55E] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>تم التحقق بنجاح</span>
                  </div>
                )}
              </div>

              {/* Enter Phone OTP code */}
              {phoneOtpSent && !phoneVerified && (
                <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    dir="ltr"
                    value={phoneOtp}
                    onChange={e => setPhoneOtp(e.target.value)}
                    className="w-full sm:w-40 bg-[#1A1A1A] border border-[#D4AF37] text-white text-center font-mono font-bold tracking-widest text-lg rounded-xl py-2 px-3 outline-none"
                    placeholder="------"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyPhoneOtp}
                    className="w-full sm:w-auto py-2.5 px-5 bg-[#22C55E] hover:bg-[#1ea34d] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    تأكيد كود الجوال
                  </button>
                  <span className="text-xs text-[#A0A0A0] flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>الصلاحية: {formatTimer(phoneOtpTimer)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* 4. البريد الالكتروني + تحقق OTP حقيقي */}
            <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
              <label className="block text-sm font-semibold text-white mb-2">
                4. البريد الالكتروني + تحقق OTP حقيقي <span className="text-[#EF4444]">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    disabled={emailVerified}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => checkDuplicate(email)}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-3 px-4 outline-none text-left font-mono disabled:opacity-60"
                    placeholder="البريد الإلكتروني"
                  />
                </div>
                {!emailVerified ? (
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    className="py-3 px-5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border border-[#D4AF37] text-[#D4AF37] font-bold text-sm rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>إرسال كود الإيميل</span>
                  </button>
                ) : (
                  <div className="py-3 px-4 bg-[#22C55E]/10 border border-[#22C55E] text-[#22C55E] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>تم التحقق بنجاح</span>
                  </div>
                )}
              </div>

              {/* Enter Email OTP code */}
              {emailOtpSent && !emailVerified && (
                <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    dir="ltr"
                    value={emailOtp}
                    onChange={e => setEmailOtp(e.target.value)}
                    className="w-full sm:w-40 bg-[#1A1A1A] border border-[#D4AF37] text-white text-center font-mono font-bold tracking-widest text-lg rounded-xl py-2 px-3 outline-none"
                    placeholder="------"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyEmailOtp}
                    className="w-full sm:w-auto py-2.5 px-5 bg-[#22C55E] hover:bg-[#1ea34d] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    تأكيد كود الإيميل
                  </button>
                  <span className="text-xs text-[#A0A0A0] flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>الصلاحية: {formatTimer(emailOtpTimer)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* 5. اسم المستخدم */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                5. اسم المستخدم <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onBlur={() => checkDuplicate(username)}
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-3 px-4 outline-none font-mono text-left"
                placeholder="اسم المستخدم لتسجيل الدخول"
              />
            </div>

            {/* 6. كلمة المرور زائد تأكيد */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  6. كلمة المرور <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-3 px-4 outline-none"
                  placeholder="كلمة المرور"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  تأكيد كلمة المرور <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-3 px-4 outline-none"
                  placeholder="إعادة كتابة كلمة المرور"
                />
              </div>
            </div>

            {/* 7. نوع النشاط */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                7. نوع النشاط <span className="text-[#EF4444]">*</span>
              </label>
              <select
                value={activityType}
                onChange={e => setActivityType(e.target.value as ActivityType)}
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-3 px-4 outline-none cursor-pointer"
              >
                <option value="محل خردوات">محل خردوات</option>
                <option value="موزع جملة">موزع جملة</option>
                <option value="ورشة">ورشة</option>
                <option value="تاجر">تاجر</option>
              </select>
            </div>

            {/* 8. المدينة */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                8. المدينة <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-3 px-4 outline-none"
                placeholder="المدينة"
              />
            </div>

            {/* 9. المدة */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                9. المدة <span className="text-[#EF4444]">*</span>
              </label>
              <select
                value={planDuration}
                onChange={e => setPlanDuration(e.target.value as PlanDuration)}
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-3 px-4 outline-none cursor-pointer"
              >
                <option value="شهر">شهر (تجربة 30 يوم مجاناً)</option>
                <option value="3 شهور">3 شهور</option>
                <option value="سنة">سنة</option>
              </select>
            </div>

            {/* 10. كيف عرفت عنا (اختياري) */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                10. كيف عرفت عنا <span className="text-[#A0A0A0] text-xs font-normal">(اختياري)</span>
              </label>
              <input
                type="text"
                value={heardFrom}
                onChange={e => setHeardFrom(e.target.value)}
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-3 px-4 outline-none"
                placeholder="صديق، إعلان، تويتر، تيك توك، واتساب..."
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-[#D4AF37] hover:bg-[#b8972c] active:scale-[0.99] disabled:opacity-50 text-[#0A0A0A] font-black text-lg rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.25)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{isSubmitting ? 'جاري المعالجة...' : 'إنشاء حساب متجرك في NOOR'}</span>
              </button>
            </div>
          </form>

          {/* Bottom link to login */}
          <div className="mt-8 pt-6 border-t border-[#2A2A2A] text-center">
            <p className="text-sm text-[#A0A0A0]">
              لديك حساب بالفعل؟{' '}
              <button
                type="button"
                onClick={() => onNavigateToLogin()}
                className="text-[#D4AF37] font-bold hover:underline cursor-pointer"
              >
                تسجيل الدخول
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Real OTP Display Modal for testing & confirmation */}
      {activeOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37] flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">
              رمز التحقق OTP ({activeOtpModal.type === 'phone' ? 'الجوال' : 'البريد'})
            </h4>
            <p className="text-xs text-[#A0A0A0] mb-4">
              أُرسل الرمز إلى: <span className="text-white font-mono">{activeOtpModal.target}</span>
            </p>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 mb-4">
              <span className="text-3xl font-black font-mono tracking-widest text-[#D4AF37]">
                {activeOtpModal.code}
              </span>
            </div>

            <p className="text-[11px] text-[#A0A0A0] mb-4">
              صلاحية الرمز 5 دقائق فقط. اضغط نسخ لتعبئته مباشرة.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (activeOtpModal.type === 'phone') {
                    setPhoneOtp(activeOtpModal.code);
                  } else {
                    setEmailOtp(activeOtpModal.code);
                  }
                  setActiveOtpModal(null);
                  showToast('تم إدراج رمز التحقق', 'info');
                }}
                className="flex-1 py-2.5 bg-[#D4AF37] hover:bg-[#b8972c] text-[#0A0A0A] font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                تعبئة الرمز تلقائياً
              </button>
              <button
                type="button"
                onClick={() => setActiveOtpModal(null)}
                className="py-2.5 px-4 bg-[#2A2A2A] text-[#A0A0A0] hover:text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
