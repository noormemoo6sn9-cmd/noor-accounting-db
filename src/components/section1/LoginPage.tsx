import React, { useState } from 'react';
import { Logo } from '../common/Logo';
import { LanguageToggle } from '../common/LanguageToggle';
import { useLanguage } from '../../i18n/LanguageContext';
import { db, hashPassword } from '../../services/db';
import { useToast } from '../common/Toast';
import {
  LogIn,
  KeyRound,
  Store,
  ShieldCheck,
  AlertTriangle,
  Lock,
  ArrowRight,
  Send,
  Timer,
  CheckCircle,
  ShieldAlert
} from 'lucide-react';

interface LoginPageProps {
  initialMessage?: string;
  onLoginSuccess: (session: {
    isLoggedIn: boolean;
    isSuperOwner: boolean;
    tenantId?: string;
    username?: string;
    role?: string;
    storeName?: string;
    subscriptionId?: string;
  }) => void;
  onNavigateToRegister: () => void;
  onNavigateToInvite: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialMessage,
  onLoginSuccess,
  onNavigateToRegister,
  onNavigateToInvite,
}) => {
  const { showToast } = useToast();
  const { language, isRtl, t } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Failed attempts tracking (Rule 7.2: lock 15 minutes after 5 failed attempts)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Modals for Forgot Password and Know Your Store
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'new_pass'>('request');
  const [forgotCode, setForgotCode] = useState('');
  const [generatedForgotCode, setGeneratedForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [showKnowStoreModal, setShowKnowStoreModal] = useState(false);
  const [knowStoreInput, setKnowStoreInput] = useState('');
  const [foundStoreInfo, setFoundStoreInfo] = useState<{
    store_name: string;
    username: string;
    subscription_id: string;
    store_slug: string;
  } | null>(null);

  // Super Owner configuration modal
  const [showSuperOwnerSetup, setShowSuperOwnerSetup] = useState(false);
  const [superOwnerEmailInput, setSuperOwnerEmailInput] = useState('');
  const [superOwnerPassInput, setSuperOwnerPassInput] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      showToast('الحساب مقفل مؤقتاً لمدة 15 دقيقة بسبب محاولات دخول خاطئة متكررة', 'danger');
      return;
    }

    if (!identifier.trim() || !password) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanId = identifier.trim().toLowerCase();
      const enteredHash = await hashPassword(password);
      const superOwner = db.getSuperOwner();

      // Check Super Owner login if configured by owner
      if (superOwner.is_configured && superOwner.email) {
        if (cleanId === superOwner.email.toLowerCase()) {
          if (superOwner.password_hash === enteredHash) {
            const session = {
              isLoggedIn: true,
              isSuperOwner: true,
              username: 'السوبر مالك',
              role: 'سوبر مالك',
              tenantId: 'NOOR',
            };
            db.setCurrentSession(session);
            db.logActivity({
              tenant_id: 'NOOR',
              user_name: 'السوبر مالك',
              action_type: 'دخول',
              details: 'تسجيل دخول ناجح لحساب السوبر مالك',
              subscription_id: 'NOOR-HQ',
              store_name: 'NOOR الرئيسي',
            });
            showToast('أهلاً بك يا صاحب المشروع في لوحة تحكم NOOR', 'success');
            onLoginSuccess(session);
            return;
          } else {
            handleFailedAttempt('كلمة المرور الخاصة بالسوبر مالك غير صحيحة');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Check Subscribers & Users
      const checkResult = db.checkAccountExists(identifier);
      if (!checkResult.exists || !checkResult.subscriber) {
        handleFailedAttempt('بيانات الدخول غير صحيحة');
        setIsSubmitting(false);
        return;
      }

      const subscriber = checkResult.subscriber;

      // Check if subscriber status is suspended
      if (subscriber.status === 'موقوفة') {
        showToast('حسابك موقوف، تواصل مع صاحب الشركة', 'danger');
        db.logActivity({
          tenant_id: subscriber.id,
          user_name: subscriber.username,
          action_type: 'دخول فاشل',
          details: 'محاولة دخول لحساب موقوف',
          subscription_id: subscriber.subscription_id,
          store_name: subscriber.store_name,
        });
        setIsSubmitting(false);
        return;
      }

      // Verify subscriber password hash
      if (subscriber.password_hash !== enteredHash) {
        handleFailedAttempt('كلمة المرور غير صحيحة');
        setIsSubmitting(false);
        return;
      }

      // Check expiration
      const expiry = new Date(subscriber.expires_at).getTime();
      const isExpired = Date.now() > expiry;

      const session = {
        isLoggedIn: true,
        isSuperOwner: false,
        tenantId: subscriber.id,
        username: subscriber.username,
        role: 'مالك',
        storeName: subscriber.store_name,
        subscriptionId: subscriber.subscription_id,
      };

      db.setCurrentSession(session);
      db.logActivity({
        tenant_id: subscriber.id,
        user_name: subscriber.username,
        action_type: 'دخول',
        details: `تسجيل دخول ناجح لمتجر ${subscriber.store_name}`,
        subscription_id: subscriber.subscription_id,
        store_name: subscriber.store_name,
      });

      if (isExpired) {
        showToast('اشتراكك منتهي، يرجى التجديد لمتابعة أعمال متجرك', 'warning');
      } else {
        showToast(`أهلاً بك في متجر ${subscriber.store_name}`, 'success');
      }

      onLoginSuccess(session);
    } catch (err) {
      showToast('حدث خطأ أثناء تسجيل الدخول', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFailedAttempt = (reason: string) => {
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);

    const check = db.checkAccountExists(identifier);
    const tenantId = check.subscriber?.id || 'عام';
    const subId = check.subscriber?.subscription_id || 'غير مسجل';
    const storeName = check.subscriber?.store_name || 'محاولة دخول غير مسجلة';

    db.logActivity({
      tenant_id: tenantId,
      user_name: identifier || 'مجهول',
      action_type: 'دخول فاشل',
      details: `محاولة دخول فاشلة (${reason}) - المحاولة ${newCount}/5`,
      subscription_id: subId,
      store_name: storeName,
    });

    if (newCount >= 5) {
      setIsLocked(true);
      showToast('تم قفل الحساب 15 دقيقة وتنبيه الإدارة لمحاولة التخمين', 'danger');
      setTimeout(() => {
        setIsLocked(false);
        setFailedAttempts(0);
      }, 15 * 60 * 1000);
    } else {
      showToast(`${reason} (المحاولة ${newCount} من 5)`, 'danger');
    }
  };

  // Configure Super Owner
  const handleSaveSuperOwner = async () => {
    if (!superOwnerPassInput || superOwnerPassInput.length < 4) {
      showToast('يرجى تحديد كلمة مرور لا تقل عن 4 خانات', 'warning');
      return;
    }
    const hash = await hashPassword(superOwnerPassInput);
    db.setSuperOwner({
      email: superOwnerEmailInput.trim(),
      password_hash: hash,
      is_configured: true,
    });
    setShowSuperOwnerSetup(false);
    showToast('تم تعيين كلمة مرور السوبر مالك بأمان! يمكنك تسجيل الدخول الآن', 'success');
  };

  // 3.4 اعرف متجرك
  const handleKnowStore = () => {
    if (!knowStoreInput.trim()) {
      showToast('يرجى كتابة الإيميل أو رقم الجوال', 'warning');
      return;
    }
    const check = db.checkAccountExists(knowStoreInput);
    if (check.exists && check.subscriber) {
      setFoundStoreInfo({
        store_name: check.subscriber.store_name,
        username: check.subscriber.username,
        subscription_id: check.subscriber.subscription_id,
        store_slug: check.subscriber.store_slug,
      });
      showToast('تم العثور على بيانات متجرك بنجاح', 'success');
    } else {
      showToast('لم يتم العثور على أي متجر مرتبط بهذه البيانات', 'danger');
    }
  };

  // 3.5 نسيت كلمة المرور
  const handleForgotRequestOtp = () => {
    if (!forgotEmail || !forgotEmail.includes('@')) {
      showToast('يرجى كتابة البريد الإلكتروني المسجل', 'warning');
      return;
    }
    const check = db.checkAccountExists(forgotEmail);
    if (!check.exists) {
      showToast('هذا البريد غير مسجل بالنظام', 'danger');
      return;
    }
    const code = db.generateOTP(forgotEmail.trim(), 'email');
    setGeneratedForgotCode(code);
    setForgotStep('verify');
    showToast('تم إرسال كود التحقق 6 أرقام للبريد', 'info');
  };

  const handleForgotVerifyOtp = () => {
    if (db.verifyOTP(forgotEmail.trim(), forgotCode)) {
      setForgotStep('new_pass');
      showToast('تم التحقق بنجاح، يمكنك الآن تعيين كلمة مرور جديدة', 'success');
    } else {
      showToast('كود التحقق غير صحيح أو منتهي الصلاحية', 'danger');
    }
  };

  const handleForgotResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      showToast('يرجى كتابة كلمة مرور صالحة', 'warning');
      return;
    }
    const check = db.checkAccountExists(forgotEmail);
    if (check.exists && check.subscriber) {
      const subscribers = db.getSubscribers();
      const idx = subscribers.findIndex(s => s.id === check.subscriber!.id);
      if (idx !== -1) {
        subscribers[idx].password_hash = await hashPassword(newPassword);
        localStorage.setItem('noor_subscribers_data', JSON.stringify(subscribers));
        showToast('تم تحديث كلمة المرور بنجاح! سجل دخولك الآن', 'success');
        setShowForgotModal(false);
        setForgotStep('request');
        setForgotEmail('');
        setForgotCode('');
        setNewPassword('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center items-center px-4 py-12 relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md z-10">
        {/* Logo and Language Toggle */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <LanguageToggle />
          <Logo size="lg" showSubtitle={true} />
        </div>

        {/* Initial message if redirected */}
        {initialMessage && (
          <div className="mb-6 p-4 bg-[#22C55E]/15 border border-[#22C55E] rounded-xl text-center text-[#22C55E] text-sm font-bold flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{initialMessage}</span>
          </div>
        )}

        {/* Login Box */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 shadow-2xl">
          <div className="border-b border-[#2A2A2A] pb-4 mb-6 text-center">
            <h2 className="text-xl font-black text-white">{t('loginTitle', 'تسجيل الدخول الموحد')}</h2>
            <p className="text-xs text-[#A0A0A0] mt-1">
              {language === 'ar' ? 'رابط موحد للجميع · الدخول يعتمد على بياناتك المسجلة' : 'Unified portal · Access depends on registered credentials'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Field 1: اسم المستخدم او الايميل او رقم الجوال */}
            <div>
              <label className="block text-xs font-semibold text-white mb-2">
                {t('loginIdentifier', 'اسم المستخدم أو البريد الإلكتروني أو رقم الجوال')}
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                disabled={isLocked}
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-3 px-4 text-sm outline-none transition-colors"
                placeholder={t('loginIdentifierPlaceholder', 'أدخل اسم المستخدم أو الإيميل أو الجوال')}
              />
            </div>

            {/* Field 2: كلمة المرور */}
            <div>
              <label className="block text-xs font-semibold text-white mb-2">
                {t('password', 'كلمة المرور')}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLocked}
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-3 px-4 text-sm outline-none transition-colors"
                placeholder="كلمة المرور"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLocked}
              className="w-full py-3.5 px-4 bg-[#D4AF37] hover:bg-[#b8972c] active:scale-[0.99] disabled:opacity-50 text-[#0A0A0A] font-black text-base rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.25)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              <span>{isSubmitting ? 'جاري التحقق...' : 'دخول'}</span>
            </button>
          </form>

          {/* Secondary Action Buttons (3.2) */}
          <div className="mt-6 pt-5 border-t border-[#2A2A2A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(true);
                setForgotStep('request');
              }}
              className="text-[#A0A0A0] hover:text-[#D4AF37] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>نسيت كلمة المرور؟</span>
            </button>

            <button
              type="button"
              onClick={() => setShowKnowStoreModal(true)}
              className="text-[#D4AF37] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" />
              <span>نسيت متجرك؟ اعرف متجرك</span>
            </button>
          </div>

          {/* Super Owner quick access note */}
          <div className="mt-6 pt-4 border-t border-[#2A2A2A]/50 text-center">
            <button
              type="button"
              onClick={() => setShowSuperOwnerSetup(true)}
              className="text-[11px] text-[#A0A0A0]/60 hover:text-[#D4AF37] transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>إعدادات أمان حساب السوبر مالك (صاحب المشروع)</span>
            </button>
          </div>
        </div>

        {/* Link to Register */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#A0A0A0]">
            ليس لديك متجر بعد؟{' '}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-[#D4AF37] font-bold hover:underline cursor-pointer"
            >
              انشئ متجرك الخاص مجاناً لمدة 30 يوم
            </button>
          </p>
        </div>
      </div>

      {/* Modal 3.4: اعرف متجرك */}
      {showKnowStoreModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-2xl max-w-md w-full p-6 text-right shadow-2xl relative animate-fade-in">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Store className="w-5 h-5 text-[#D4AF37]" />
              <span>اعرف متجرك</span>
            </h3>
            <p className="text-xs text-[#A0A0A0] mb-4">
              اكتب الإيميل أو رقم الجوال الذي سجلت به للوصول إلى تفاصيل متجرك
            </p>

            <div className="mb-4">
              <input
                type="text"
                value={knowStoreInput}
                onChange={e => setKnowStoreInput(e.target.value)}
                placeholder="الإيميل أو رقم الجوال"
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2.5 px-3.5 text-xs outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleKnowStore}
              className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#b8972c] text-[#0A0A0A] font-bold text-xs rounded-xl mb-4 cursor-pointer"
            >
              بحث واسترجاع المتجر
            </button>

            {foundStoreInfo && (
              <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 text-xs space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-[#A0A0A0]">اسم المتجر:</span>
                  <span className="font-bold text-white">{foundStoreInfo.store_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0A0A0]">رقم الاشتراك:</span>
                  <span className="font-mono font-bold text-[#D4AF37]">{foundStoreInfo.subscription_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0A0A0]">اسم المستخدم:</span>
                  <span className="font-bold text-white">{foundStoreInfo.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0A0A0]">رابط المتجر:</span>
                  <span className="font-mono text-[#D4AF37]">noor.com/store/{foundStoreInfo.store_slug}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowKnowStoreModal(false);
                setFoundStoreInfo(null);
                setKnowStoreInput('');
              }}
              className="w-full py-2 bg-[#2A2A2A] text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Modal 3.5: نسيت كلمة المرور */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-2xl max-w-md w-full p-6 text-right shadow-2xl relative animate-fade-in">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#D4AF37]" />
              <span>استعادة كلمة المرور</span>
            </h3>

            {forgotStep === 'request' && (
              <div>
                <p className="text-xs text-[#A0A0A0] mb-4">
                  اكتب بريدك الإلكتروني المسجل ليصلك كود تحقق 6 أرقام
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="بريدك الإلكتروني"
                  className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2.5 px-3 text-xs outline-none mb-4"
                />
                <button
                  type="button"
                  onClick={handleForgotRequestOtp}
                  className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#b8972c] text-[#0A0A0A] font-bold text-xs rounded-xl cursor-pointer"
                >
                  إرسال كود التحقق
                </button>
              </div>
            )}

            {forgotStep === 'verify' && (
              <div>
                <p className="text-xs text-[#A0A0A0] mb-3">
                  تم إرسال كود التحقق (الكود للتجربة: <strong className="text-[#D4AF37] font-mono">{generatedForgotCode}</strong>)
                </p>
                <input
                  type="text"
                  maxLength={6}
                  value={forgotCode}
                  onChange={e => setForgotCode(e.target.value)}
                  placeholder="أدخل كود 6 أرقام"
                  className="w-full bg-[#111111] border border-[#D4AF37] text-white text-center font-mono font-bold tracking-widest text-base rounded-xl py-2.5 px-3 outline-none mb-4"
                />
                <button
                  type="button"
                  onClick={handleForgotVerifyOtp}
                  className="w-full py-2.5 bg-[#22C55E] hover:bg-[#1ea34d] text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  تأكيد الكود
                </button>
              </div>
            )}

            {forgotStep === 'new_pass' && (
              <div>
                <p className="text-xs text-[#A0A0A0] mb-3">
                  اكتب كلمة المرور الجديدة لمتجرك
                </p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2.5 px-3 text-xs outline-none mb-4"
                />
                <button
                  type="button"
                  onClick={handleForgotResetPassword}
                  className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#b8972c] text-[#0A0A0A] font-bold text-xs rounded-xl cursor-pointer"
                >
                  حفظ كلمة المرور الجديدة
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full mt-3 py-2 bg-[#2A2A2A] text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Modal 1.4: إعداد حساب السوبر مالك الآمن */}
      {showSuperOwnerSetup && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-2xl max-w-md w-full p-6 text-right shadow-2xl relative animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37] text-[#D4AF37] flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-white text-center mb-1">
              إعداد حساب السوبر مالك (صاحب المشروع)
            </h3>
            <p className="text-xs text-[#A0A0A0] text-center mb-5 leading-relaxed">
              وفقاً للبند 1.4: "صاحب المشروع يحط كلمة السر بنفسه في مكان آمن".
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  البريد الإلكتروني المعتمد للسوبر مالك:
                </label>
                <input
                  type="email"
                  value={superOwnerEmailInput}
                  onChange={e => setSuperOwnerEmailInput(e.target.value)}
                  className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2.5 px-3 text-xs outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  كلمة المرور الخاصة بك (تحفظ مشفرة في النظام):
                </label>
                <input
                  type="password"
                  value={superOwnerPassInput}
                  onChange={e => setSuperOwnerPassInput(e.target.value)}
                  placeholder="اكتب كلمة مرورك السرية"
                  className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2.5 px-3 text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveSuperOwner}
                className="flex-1 py-3 bg-[#D4AF37] hover:bg-[#b8972c] text-[#0A0A0A] font-black text-xs rounded-xl transition-all cursor-pointer shadow-lg"
              >
                حفظ وتأكيد السوبر مالك
              </button>
              <button
                type="button"
                onClick={() => setShowSuperOwnerSetup(false)}
                className="py-3 px-4 bg-[#2A2A2A] text-[#A0A0A0] hover:text-white text-xs font-medium rounded-xl cursor-pointer"
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
