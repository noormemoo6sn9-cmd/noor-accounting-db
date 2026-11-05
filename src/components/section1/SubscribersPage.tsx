import React, { useState, useEffect, useMemo } from 'react';
import { Logo } from '../common/Logo';
import { LanguageToggle } from '../common/LanguageToggle';
import { useLanguage } from '../../i18n/LanguageContext';
import { db, getRemainingDays, getWhatsAppUrl } from '../../services/db';
import { Subscriber } from '../../types';
import { useToast } from '../common/Toast';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Printer,
  Copy,
  Check,
  Power,
  CalendarPlus,
  Trash2,
  TrendingUp,
  MessageCircle,
  ExternalLink,
  Users,
  Building,
  Key,
  Shield,
  X,
  Lock,
  ChevronDown
} from 'lucide-react';

interface SubscribersPageProps {
  onLogout: () => void;
  onNavigateToLogin: () => void;
  onNavigateToInvite: () => void;
}

export const SubscribersPage: React.FC<SubscribersPageProps> = ({
  onLogout,
  onNavigateToLogin,
  onNavigateToInvite,
}) => {
  const { showToast } = useToast();
  const { language, isRtl, t } = useLanguage();

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // Copied button states for Section 5
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedJoin, setCopiedJoin] = useState(false);

  // Sales inspection modal (مشاهدة مبيعات الشركة بدون دخول نسختها)
  const [inspectSubscriber, setInspectSubscriber] = useState<Subscriber | null>(null);

  // Delete modal state
  const [deleteModalSubscriber, setDeleteModalSubscriber] = useState<Subscriber | null>(null);
  const [deletePassword, setDeletePassword] = useState('');

  // Recycle Bin modal state (Rule 7.10)
  const [showRecycleBinModal, setShowRecycleBinModal] = useState(false);
  const [recycledItems, setRecycledItems] = useState<any[]>([]);

  // Extend dropdown state
  const [activeExtendDropdown, setActiveExtendDropdown] = useState<string | null>(null);

  const reloadSubscribers = () => {
    setSubscribers(db.getSubscribers());
    setRecycledItems(db.getRecycleBin());
  };

  useEffect(() => {
    reloadSubscribers();
  }, []);

  // Filtered subscribers list
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(sub => {
      const matchSearch =
        sub.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.subscription_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.phone.includes(searchTerm) ||
        sub.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ? true : sub.status === statusFilter;

      const matchActivity =
        activityFilter === 'all' ? true : sub.activity_type === activityFilter;

      return matchSearch && matchStatus && matchActivity;
    });
  }, [subscribers, searchTerm, statusFilter, activityFilter]);

  // Section 5: Copy Buttons
  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/invite/NOOR`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(true);
    showToast('تم نسخ رابط نشر متجر NOOR بنجاح', 'success');
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleCopyJoin = () => {
    const joinUrl = `${window.location.origin}/join/NOOR`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedJoin(true);
    showToast('تم نسخ رابط دعوة مندوب NOOR بنجاح', 'success');
    setTimeout(() => setCopiedJoin(false), 2500);
  };

  // Toggle Status: تفعيل / ايقاف الشركة وكل مندوبينها مرة وحدة
  const handleToggleStatus = (sub: Subscriber) => {
    const updated = db.toggleSubscriberStatus(sub.id);
    if (updated) {
      showToast(
        updated.status === 'موقوفة'
          ? `تم إيقاف شركة ${updated.store_name} وكل مندوبيها`
          : `تم تفعيل شركة ${updated.store_name} بنجاح`,
        'success'
      );
      reloadSubscribers();
    }
  };

  // Extend Subscription: تمديد زائد 30 زائد 90 سنة (Golden Rule 6)
  const handleExtend = (sub: Subscriber, days: number, label: string) => {
    const updated = db.extendSubscriber(sub.id, days);
    if (updated) {
      showToast(`تم تمديد اشتراك ${sub.store_name} (${label}) بنجاح`, 'success');
      setActiveExtendDropdown(null);
      reloadSubscribers();
    }
  };

  // Delete Subscriber Confirmation (Rule 7.10: 30-day recycle bin)
  const handleDeleteConfirm = () => {
    if (!deleteModalSubscriber) return;
    if (!deletePassword) {
      showToast('يرجى كتابة كلمة مرور السوبر مالك لتأكيد الحذف', 'warning');
      return;
    }

    const success = db.deleteSubscriber(deleteModalSubscriber.id);
    if (success) {
      showToast(
        `تم نقل شركة ${deleteModalSubscriber.store_name} إلى سلة المحذوفات (محفوظة لمدة 30 يوم قبل الحذف النهائي)`,
        'success'
      );
      setDeleteModalSubscriber(null);
      setDeletePassword('');
      reloadSubscribers();
    } else {
      showToast('حدث خطأ أثناء محاولة الحذف', 'danger');
    }
  };

  // Restore Subscriber from 30-day Recycle Bin
  const handleRestoreSubscriber = (tenantId: string) => {
    const success = db.restoreSubscriber(tenantId);
    if (success) {
      showToast('تمت استعادة الشركة وبياناتها ومندوبيها بنجاح', 'success');
      reloadSubscribers();
    } else {
      showToast('تعذر استعادة الشركة من سلة المحذوفات', 'danger');
    }
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (filteredSubscribers.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'warning');
      return;
    }

    const headers = [
      'رقم الاشتراك',
      'اسم الشركة',
      'اسم المالك',
      'الجوال',
      'البريد',
      'اسم المستخدم',
      'النشاط',
      'المدينة',
      'الخطة',
      'تاريخ الاشتراك',
      'تاريخ الانتهاء',
      'الايام المتبقية',
      'الحالة',
      'المندوبين',
    ];

    const rows = filteredSubscribers.map(sub => [
      sub.subscription_id,
      sub.store_name,
      sub.owner_name,
      sub.phone,
      sub.email,
      sub.username,
      sub.activity_type,
      sub.city,
      sub.plan_duration,
      new Date(sub.created_at).toLocaleDateString('ar-SA'),
      new Date(sub.expires_at).toLocaleDateString('ar-SA'),
      getRemainingDays(sub.expires_at),
      sub.status,
      sub.delegates_count,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `noor_subscribers_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('تم تصدير ملف المشتركين بنجاح', 'success');
  };

  // Print PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 sm:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-[#2A2A2A] no-print">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Language Toggle before Logo */}
          <LanguageToggle />
          <Logo size="sm" showSubtitle={false} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-[#D4AF37]">NOOR</span>
              <span className="text-xs text-[#A0A0A0]">·</span>
              <span className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/30 font-semibold">
                {language === 'ar' ? 'سوبر مالك فقط' : 'Super Owner Only'}
              </span>
            </div>
            <h1 className="text-lg font-bold text-white mt-0.5">
              {t('subscribersTitle', 'إدارة المشتركين والتجار')}
            </h1>
          </div>
        </div>

        {/* Section 5 Buttons for Super Owner + Logout */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Button 1: join/NOOR */}
          <button
            onClick={handleCopyJoin}
            title="انسخ رابط دعوة مندوب NOOR"
            className="py-2 px-3.5 bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] hover:border-[#D4AF37] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            {copiedJoin ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4 text-[#D4AF37]" />}
            <span>انسخ رابط دعوة مندوب (join/NOOR)</span>
          </button>

          {/* Button 2: invite/NOOR */}
          <button
            onClick={handleCopyInvite}
            title="انسخ رابط نشر متجر NOOR للناس"
            className="py-2 px-3.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37] text-[#D4AF37] text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            {copiedInvite ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4 text-[#D4AF37]" />}
            <span>انسخ رابط نشر متجر NOOR (invite/NOOR)</span>
          </button>

          <button
            onClick={onLogout}
            className="py-2 px-3 bg-[#2A2A2A] hover:bg-[#EF4444] text-[#A0A0A0] hover:text-white text-xs font-medium rounded-xl transition-all cursor-pointer"
          >
            خروج
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="mt-6 space-y-6">
        {/* Filters and Search Bar */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 no-print">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-[#A0A0A0] absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="بحث باسم الشركة، رقم الاشتراك، الجوال، المالك، المدينة..."
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2.5 pr-11 pl-4 text-sm outline-none transition-colors"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
              <div className="flex items-center gap-1.5 bg-[#111111] border border-[#2A2A2A] rounded-xl px-3 py-1.5">
                <Filter className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs text-[#A0A0A0]">الحالة:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all">الكل</option>
                  <option value="مفعلة">مفعلة</option>
                  <option value="30 يوم مجانا">30 يوم مجانا</option>
                  <option value="منتهية">منتهية</option>
                  <option value="موقوفة">موقوفة</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#111111] border border-[#2A2A2A] rounded-xl px-3 py-1.5">
                <span className="text-xs text-[#A0A0A0]">النشاط:</span>
                <select
                  value={activityFilter}
                  onChange={e => setActivityFilter(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all">كل الأنشطة</option>
                  <option value="محل خردوات">محل خردوات</option>
                  <option value="موزع جملة">موزع جملة</option>
                  <option value="ورشة">ورشة</option>
                  <option value="تاجر">تاجر</option>
                </select>
              </div>

              {/* Action Buttons: Export & Print */}
              <button
                onClick={handleExportCSV}
                className="py-2 px-3 bg-[#111111] hover:bg-[#222222] border border-[#2A2A2A] hover:border-[#D4AF37] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#22C55E]" />
                <span>تصدير Excel</span>
              </button>

              <button
                onClick={handlePrint}
                className="py-2 px-3 bg-[#111111] hover:bg-[#222222] border border-[#2A2A2A] hover:border-[#D4AF37] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" />
                <span>طباعة PDF</span>
              </button>

              {/* Recycle Bin Button (Rule 7.10) */}
              <button
                onClick={() => setShowRecycleBinModal(true)}
                className="py-2 px-3 bg-[#111111] hover:bg-[#222222] border border-[#EF4444]/40 hover:border-[#EF4444] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-[#EF4444]" />
                <span>سلة المحذوفات ({recycledItems.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printable Document Title (Hidden on screen, shown on print) */}
        <div className="hidden print:block text-center mb-6">
          <h2 className="text-2xl font-black text-black">نظام NOOR - تقرير المشتركين</h2>
          <p className="text-xs text-gray-600">تاريخ التصدير: {new Date().toLocaleDateString('ar-SA')}</p>
        </div>

        {/* Subscribers Table (14 Columns specified in 1.3) */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-[#111111] border-b border-[#2A2A2A] text-[#A0A0A0] font-bold">
                  <th className="py-3.5 px-3">1. رقم الاشتراك</th>
                  <th className="py-3.5 px-3">2. اسم الشركة</th>
                  <th className="py-3.5 px-3">3. الجوال</th>
                  <th className="py-3.5 px-3">4. البريد</th>
                  <th className="py-3.5 px-3">5. اسم المستخدم</th>
                  <th className="py-3.5 px-3">6. نوع النشاط</th>
                  <th className="py-3.5 px-3">7. المدينة</th>
                  <th className="py-3.5 px-3">8. الخطة</th>
                  <th className="py-3.5 px-3">9. تاريخ الاشتراك</th>
                  <th className="py-3.5 px-3">10. تاريخ الانتهاء</th>
                  <th className="py-3.5 px-3">11. كم يوم باقي</th>
                  <th className="py-3.5 px-3">12. الحالة</th>
                  <th className="py-3.5 px-3">13. رابط نسختها</th>
                  <th className="py-3.5 px-3">14. المندوبين</th>
                  <th className="py-3.5 px-3 text-center no-print">إجراءات التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]/60">
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-[#A0A0A0]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-[#2A2A2A]" />
                        <p className="text-sm">لا توجد شركات مشتركة مسجلة بعد</p>
                        <p className="text-xs text-[#A0A0A0]/60">
                          النسخة نظيفة وفارغة كما ينص التقرير. يمكنك دعوة التجار عبر رابط invite/NOOR
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map(sub => {
                    const remainingDays = getRemainingDays(sub.expires_at);
                    const isExpiringSoon = remainingDays <= 3;
                    const storeUrl = `noor.com/store/${sub.store_slug}`;

                    // WhatsApp semi-automatic message
                    const whatsappMsg = `مرحباً ${sub.owner_name} - شركة ${sub.store_name}\nرقم اشتراككم في NOOR: ${sub.subscription_id}\nالحالة الحالية: ${sub.status}\nالأيام المتبقية: ${remainingDays} يوم\nرابط نسختكم: ${storeUrl}`;
                    const whatsappUrl = getWhatsAppUrl(sub.phone, whatsappMsg);

                    return (
                      <tr key={sub.id} className="hover:bg-[#222222]/50 transition-colors">
                        {/* 1. رقم الاشتراك */}
                        <td className="py-3 px-3 font-mono font-bold text-[#D4AF37]">
                          {sub.subscription_id}
                        </td>

                        {/* 2. اسم الشركة */}
                        <td className="py-3 px-3 font-bold text-white">
                          {sub.store_name}
                        </td>

                        {/* 3. الجوال */}
                        <td className="py-3 px-3 font-mono text-left" dir="ltr">
                          {sub.phone}
                        </td>

                        {/* 4. الايميل */}
                        <td className="py-3 px-3 font-mono text-[#A0A0A0]" dir="ltr">
                          {sub.email}
                        </td>

                        {/* 5. اسم المستخدم */}
                        <td className="py-3 px-3 font-mono text-white">
                          {sub.username}
                        </td>

                        {/* 6. نوع النشاط */}
                        <td className="py-3 px-3 text-[#A0A0A0]">
                          {sub.activity_type}
                        </td>

                        {/* 7. المدينة */}
                        <td className="py-3 px-3 text-[#A0A0A0]">
                          {sub.city}
                        </td>

                        {/* 8. الخطة */}
                        <td className="py-3 px-3">
                          <span className="text-[#D4AF37] font-semibold">{sub.plan_duration}</span>
                        </td>

                        {/* 9. تاريخ الاشتراك */}
                        <td className="py-3 px-3 font-mono text-[#A0A0A0]">
                          {new Date(sub.created_at).toLocaleDateString('ar-SA')}
                        </td>

                        {/* 10. تاريخ الانتهاء */}
                        <td className="py-3 px-3 font-mono text-[#A0A0A0]">
                          {new Date(sub.expires_at).toLocaleDateString('ar-SA')}
                        </td>

                        {/* 11. كم يوم باقي (بالأحمر لو أقل من 3 أيام) */}
                        <td className="py-3 px-3 font-mono font-bold">
                          <span className={isExpiringSoon ? 'text-[#EF4444] font-black' : 'text-[#22C55E]'}>
                            {remainingDays > 0 ? `${remainingDays} يوم` : 'منتهي'}
                          </span>
                        </td>

                        {/* 12. الحالة */}
                        <td className="py-3 px-3">
                          <span
                            className={`font-semibold ${
                              sub.status === 'مفعلة'
                                ? 'text-[#22C55E]'
                                : sub.status === '30 يوم مجانا'
                                ? 'text-[#D4AF37]'
                                : sub.status === 'منتهية'
                                ? 'text-[#EF4444]'
                                : 'text-[#F59E0B]'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>

                        {/* 13. رابط نسختها الخاصة */}
                        <td className="py-3 px-3 font-mono text-xs text-[#A0A0A0]">
                          <span className="text-[#D4AF37] hover:underline cursor-pointer" title={storeUrl}>
                            {storeUrl}
                          </span>
                        </td>

                        {/* 14. عدد المندوبين تحتها */}
                        <td className="py-3 px-3 font-mono text-center font-bold text-white">
                          {sub.delegates_count}
                        </td>

                        {/* ازرار التحكم (1.3) */}
                        <td className="py-3 px-3 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* تفعيل / ايقاف الشركة وكل مندوبينها */}
                            <button
                              onClick={() => handleToggleStatus(sub)}
                              title={sub.status === 'موقوفة' ? 'تفعيل الشركة ومندوبيها' : 'إيقاف الشركة ومندوبيها'}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                sub.status === 'موقوفة'
                                  ? 'bg-[#22C55E]/15 border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E]/25'
                                  : 'bg-[#EF4444]/15 border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/25'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            {/* تمديد (+30, +90, سنة) */}
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveExtendDropdown(activeExtendDropdown === sub.id ? null : sub.id)
                                }
                                title="تمديد الاشتراك"
                                className="p-1.5 bg-[#D4AF37]/15 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/25 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                <ChevronDown className="w-2.5 h-2.5" />
                              </button>

                              {activeExtendDropdown === sub.id && (
                                <div className="absolute left-0 bottom-full mb-1 z-30 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl py-1 w-28 text-right animate-fade-in">
                                  <button
                                    onClick={() => handleExtend(sub, 30, '+30 يوم')}
                                    className="w-full text-right px-3 py-1.5 text-xs text-white hover:bg-[#2A2A2A] transition-colors"
                                  >
                                    +30 يوم
                                  </button>
                                  <button
                                    onClick={() => handleExtend(sub, 90, '+90 يوم')}
                                    className="w-full text-right px-3 py-1.5 text-xs text-white hover:bg-[#2A2A2A] transition-colors"
                                  >
                                    +90 يوم
                                  </button>
                                  <button
                                    onClick={() => handleExtend(sub, 365, 'سنة كاملة')}
                                    className="w-full text-right px-3 py-1.5 text-xs text-[#D4AF37] font-bold hover:bg-[#2A2A2A] transition-colors"
                                  >
                                    + سنة كاملة
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* مشاهدة مبيعات الشركة بدون دخول نسختها */}
                            <button
                              onClick={() => setInspectSubscriber(sub)}
                              title="مشاهدة مبيعات الشركة بدون دخول نسختها"
                              className="p-1.5 bg-[#111111] border border-[#2A2A2A] hover:border-[#D4AF37] text-[#A0A0A0] hover:text-[#D4AF37] rounded-lg transition-colors cursor-pointer"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>

                            {/* زر ارسال واتساب يفتح الواتساب على رقم الشركة دايركت */}
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="إرسال واتساب للشركة"
                              className="p-1.5 bg-[#22C55E]/15 border border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E]/25 rounded-lg transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>

                            {/* حذف الشركة كاملة */}
                            <button
                              onClick={() => setDeleteModalSubscriber(sub)}
                              title="حذف الشركة كاملة"
                              className="p-1.5 bg-[#EF4444]/15 border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/25 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal: مشاهدة مبيعات الشركة بدون دخول نسختها (1.3) */}
      {inspectSubscriber && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setInspectSubscriber(null)}
              className="absolute top-4 left-4 p-1.5 rounded-lg bg-[#2A2A2A] text-[#A0A0A0] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{inspectSubscriber.store_name}</h3>
                <p className="text-xs text-[#A0A0A0]">
                  رقم الاشتراك: <span className="text-[#D4AF37] font-mono">{inspectSubscriber.subscription_id}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#111111] border border-[#2A2A2A] p-4 rounded-xl text-center">
                <span className="text-xs text-[#A0A0A0]">إجمالي المبيعات</span>
                <p className="text-xl font-black font-mono text-white mt-1">
                  {inspectSubscriber.sales_summary?.total_sales ?? 0} ر.س
                </p>
              </div>
              <div className="bg-[#111111] border border-[#2A2A2A] p-4 rounded-xl text-center">
                <span className="text-xs text-[#A0A0A0]">عدد الفواتير</span>
                <p className="text-xl font-black font-mono text-[#D4AF37] mt-1">
                  {inspectSubscriber.sales_summary?.invoices_count ?? 0}
                </p>
              </div>
              <div className="bg-[#111111] border border-[#2A2A2A] p-4 rounded-xl text-center">
                <span className="text-xs text-[#A0A0A0]">المدفوع المستلم</span>
                <p className="text-xl font-black font-mono text-[#22C55E] mt-1">
                  {inspectSubscriber.sales_summary?.paid_amount ?? 0} ر.س
                </p>
              </div>
              <div className="bg-[#111111] border border-[#2A2A2A] p-4 rounded-xl text-center">
                <span className="text-xs text-[#A0A0A0]">المتبقي على العملاء</span>
                <p className="text-xl font-black font-mono text-[#EF4444] mt-1">
                  {inspectSubscriber.sales_summary?.remaining_amount ?? 0} ر.س
                </p>
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 text-xs text-[#A0A0A0] space-y-2">
              <div className="flex justify-between">
                <span>اسم المالك:</span>
                <span className="text-white font-medium">{inspectSubscriber.owner_name}</span>
              </div>
              <div className="flex justify-between">
                <span>الجوال:</span>
                <span className="text-white font-mono" dir="ltr">{inspectSubscriber.phone}</span>
              </div>
              <div className="flex justify-between">
                <span>المدينة والنشاط:</span>
                <span className="text-white">{inspectSubscriber.city} · {inspectSubscriber.activity_type}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setInspectSubscriber(null)}
                className="py-2.5 px-6 bg-[#2A2A2A] hover:bg-[#333333] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: حماية الحذف وسلة المحذوفات 30 يوم (1.3 & 7.10) */}
      {deleteModalSubscriber && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border-2 border-[#EF4444] rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444] flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-white text-center mb-2">
              نقل الشركة إلى سلة المحذوفات (حفظ 30 يوماً)
            </h3>
            <p className="text-xs text-[#A0A0A0] text-center mb-6 leading-relaxed">
              وفقاً للبند 7.10 من التقرير: الحذف لا يكون نهائياً مباشرة، بل ينحفظ لمدة 30 يوماً في سلة المحذوفات قبل الحذف النهائي، ويمكن استعادتها خلال هذه المدة.
              <br />
              الشركة: <strong className="text-white">{deleteModalSubscriber.store_name}</strong> · رقم الاشتراك: <strong className="text-[#D4AF37] font-mono">{deleteModalSubscriber.subscription_id}</strong>
            </p>

            <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 mb-5">
              <label className="block text-xs font-semibold text-white mb-2">
                كلمة مرور السوبر مالك لتأكيد النقل:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder="اكتب كلمة المرور للتأكيد"
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] focus:border-[#EF4444] text-white rounded-lg py-2.5 px-3 text-xs outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 bg-[#EF4444] hover:bg-[#dc2626] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg"
              >
                تأكيد النقل لسلة المحذوفات
              </button>
              <button
                onClick={() => {
                  setDeleteModalSubscriber(null);
                  setDeletePassword('');
                }}
                className="py-3 px-5 bg-[#2A2A2A] hover:bg-[#333333] text-[#A0A0A0] hover:text-white text-xs font-medium rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: عرض سلة المحذوفات (Rule 7.10) */}
      {showRecycleBinModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setShowRecycleBinModal(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg bg-[#2A2A2A] text-[#A0A0A0] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#EF4444]/20 border border-[#EF4444] flex items-center justify-center text-[#EF4444]">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">سلة المحذوفات (حفظ 30 يوماً - البند 7.10)</h3>
                <p className="text-xs text-[#A0A0A0]">
                  الشركات المنقولة للمحذوفات تُحفظ لمدة 30 يوماً ويمكنك استعادتها بكافة بياناتها ومندوبيها
                </p>
              </div>
            </div>

            {recycledItems.length === 0 ? (
              <div className="py-12 text-center text-[#A0A0A0] border border-dashed border-[#2A2A2A] rounded-xl mb-4">
                <Trash2 className="w-8 h-8 mx-auto mb-2 text-[#2A2A2A]" />
                <p className="text-sm">سلة المحذوفات فارغة حالياً</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[350px] mb-4">
                <table className="w-full text-right border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#111111] border-b border-[#2A2A2A] text-[#A0A0A0]">
                      <th className="py-2.5 px-3">رقم الاشتراك</th>
                      <th className="py-2.5 px-3">اسم الشركة</th>
                      <th className="py-2.5 px-3">المالك</th>
                      <th className="py-2.5 px-3">تاريخ الحذف</th>
                      <th className="py-2.5 px-3">الحذف النهائي بعد</th>
                      <th className="py-2.5 px-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {recycledItems.map(item => {
                      const daysLeft = Math.max(0, getRemainingDays(item.purge_at));

                      return (
                        <tr key={item.id} className="hover:bg-[#222222]/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#D4AF37]">
                            {item.subscriber.subscription_id}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {item.subscriber.store_name}
                          </td>
                          <td className="py-2.5 px-3 text-[#A0A0A0]">
                            {item.subscriber.owner_name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#A0A0A0]">
                            {new Date(item.deleted_at).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#EF4444] font-bold">
                            {daysLeft} يوم
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => {
                                handleRestoreSubscriber(item.id);
                                setShowRecycleBinModal(false);
                              }}
                              className="py-1 px-3 bg-[#22C55E] hover:bg-[#1ea34d] text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              استعادة
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowRecycleBinModal(false)}
                className="py-2 px-5 bg-[#2A2A2A] hover:bg-[#333333] text-white text-xs font-semibold rounded-xl cursor-pointer"
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
