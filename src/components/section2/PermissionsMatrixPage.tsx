import React, { useState, useEffect } from 'react';
import { Logo } from '../common/Logo';
import { LanguageToggle } from '../common/LanguageToggle';
import { db } from '../../services/db';
import { 
  User, 
  DelegateRequest, 
  SystemPageName, 
  PermissionLevel, 
  SYSTEM_PAGES, 
  Subscriber 
} from '../../types';
import { useToast } from '../common/Toast';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Shield,
  Lock,
  UserPlus,
  Users,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  Eye,
  Sliders,
  EyeOff,
  UserCheck
} from 'lucide-react';

interface PermissionsMatrixPageProps {
  currentTenantId?: string;
  onLogout?: () => void;
  onNavigateToJoin?: (slug: string) => void;
  onNavigateToInvite?: () => void;
}

export const PermissionsMatrixPage: React.FC<PermissionsMatrixPageProps> = ({
  currentTenantId,
  onLogout,
  onNavigateToJoin,
  onNavigateToInvite,
}) => {
  const { showToast } = useToast();
  const { t, language, isRtl } = useLanguage();

  // Unified active tenant context
  const initialContext = db.getActiveTenantContext(currentTenantId);

  const [activeTenantId, setActiveTenantId] = useState<string>(initialContext.tenantId);
  const [currentStore, setCurrentStore] = useState<Subscriber | undefined>(initialContext.subscriber);
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<string>(initialContext.subscriptionId);
  const [activeStoreName, setActiveStoreName] = useState<string>(initialContext.storeName);

  const [tenantUsers, setTenantUsers] = useState<User[]>(() => {
    return db.getTenantUsers(initialContext.tenantId);
  });
  const [pendingRequests, setPendingRequests] = useState<DelegateRequest[]>(() => {
    return db.getDelegateRequests(initialContext.tenantId).filter(r => r.status === 'معلق');
  });

  // Section 5 Copy Buttons
  const [copiedJoin, setCopiedJoin] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Cell Edit Modal (Rule 2.3: تختار وتسوي حفظ)
  const [activeCellEdit, setActiveCellEdit] = useState<{
    user: User;
    page: SystemPageName;
    currentPerm: PermissionLevel;
  } | null>(null);
  const [selectedModalPerm, setSelectedModalPerm] = useState<PermissionLevel>('مشاهدة');

  // Box 3: Delegate Approval Modal (صاحب الشركة يوافق ويحدد الصلاحية ويسوي حفظ)
  const [approvingReq, setApprovingReq] = useState<DelegateRequest | null>(null);
  const [approvalRole, setApprovalRole] = useState<'مندوب' | 'ادمن'>('مندوب');
  const [approvalPreset, setApprovalPreset] = useState<'standard' | 'control_all'>('standard');

  // All stores list (to support switching between stores if multiple exist)
  const [allStores, setAllStores] = useState<Subscriber[]>(() => db.getSubscribers());

  // Manual User Addition Form (Box 2)
  const [manualEmail, setManualEmail] = useState('');
  const [manualDisplayName, setManualDisplayName] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualRole, setManualRole] = useState<'مندوب' | 'ادمن'>('مندوب');
  const [manualPhone, setManualPhone] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Synchronize company & users
  const reloadData = (preferredTenantId?: string) => {
    const ctx = db.getActiveTenantContext(preferredTenantId || activeTenantId || currentTenantId);

    setActiveTenantId(ctx.tenantId);
    setCurrentStore(ctx.subscriber);
    setActiveSubscriptionId(ctx.subscriptionId);
    setActiveStoreName(ctx.storeName);

    const users = db.getTenantUsers(ctx.tenantId);
    setTenantUsers(users);

    const requests = db.getDelegateRequests(ctx.tenantId);
    setPendingRequests(requests.filter(r => r.status === 'معلق'));
    setAllStores(db.getSubscribers());
  };

  useEffect(() => {
    reloadData(currentTenantId);
  }, [currentTenantId]);

  // Section 5 Buttons for Merchant Store
  const handleCopyJoin = () => {
    const slug = currentStore?.store_slug || 'noor';
    const joinUrl = `${window.location.origin}/join/${slug}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedJoin(true);
    showToast(
      language === 'ar'
        ? `تم نسخ رابط دعوة المندوبين (join/${slug})`
        : `Copied delegate join link (join/${slug})`,
      'success'
    );
    setTimeout(() => setCopiedJoin(false), 2500);
  };

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/invite/NOOR`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(true);
    showToast(
      language === 'ar'
        ? 'تم نسخ رابط نشر متجر NOOR (invite/NOOR)'
        : 'Copied NOOR store invite link (invite/NOOR)',
      'success'
    );
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  // Cell Click Handler
  const handleCellClick = (user: User, page: SystemPageName) => {
    // Owner is permanently locked (Golden Rule 2.4)
    if (user.role === 'مالك') {
      showToast(
        language === 'ar'
          ? 'صلاحية المالك حر مقفلة دائماً ولا يمكن تعديلها (القاعدة 2.4)'
          : 'Owner permission is Gold Full Access and cannot be modified (Rule 2.4)',
        'warning'
      );
      return;
    }

    const currentPerm = user.permissions?.[page] || 'مشاهدة';
    setSelectedModalPerm(currentPerm);
    setActiveCellEdit({ user, page, currentPerm });
  };

  // Save updated permission (Rule 2.3: تختار وتسوي حفظ)
  const handleSavePermission = (newLevel: PermissionLevel) => {
    if (!activeCellEdit) return;

    const sub = db.resolveSubscriber(activeTenantId || currentTenantId);
    const tid = sub ? sub.id : activeTenantId;

    const success = db.updateUserPermission(
      tid,
      activeCellEdit.user.id,
      activeCellEdit.page,
      newLevel
    );

    if (success) {
      showToast(
        language === 'ar'
          ? `تم حفظ وتحديث صلاحية (${getPageDisplayName(activeCellEdit.page)}) للمستخدم ${activeCellEdit.user.display_name} إلى (${getPermDisplayName(newLevel)})`
          : `Saved and updated (${getPageDisplayName(activeCellEdit.page)}) permission for ${activeCellEdit.user.display_name} to (${getPermDisplayName(newLevel)})`,
        'success'
      );

      // Instant local state update
      setTenantUsers(prev =>
        prev.map(u => {
          if (u.id === activeCellEdit.user.id) {
            return {
              ...u,
              permissions: {
                ...u.permissions,
                [activeCellEdit.page]: newLevel,
              },
            };
          }
          return u;
        })
      );

      setActiveCellEdit(null);
      reloadData(tid);
    } else {
      showToast(
        language === 'ar' ? 'تعذر تحديث الصلاحية' : 'Failed to update permission',
        'danger'
      );
    }
  };

  // Box 2: Add Manual User (Binds directly to active company and displays instantly)
  const handleAddManualUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualEmail.trim() || !manualDisplayName.trim() || !manualUsername.trim() || !manualPassword || !manualPhone.trim()) {
      showToast(
        language === 'ar' ? 'يرجى تعبئة كافة حقول المستخدم الجديد' : 'Please fill all required fields',
        'warning'
      );
      return;
    }

    const sub = db.resolveSubscriber(activeTenantId || currentTenantId);
    const targetTenantId = sub ? sub.id : activeTenantId;

    setIsAddingUser(true);

    try {
      const result = await db.addManualUser(activeTenantId, {
        email: manualEmail,
        display_name: manualDisplayName,
        username: manualUsername,
        password: manualPassword,
        role: manualRole,
        phone: manualPhone,
      });

      if (result.exists) {
        showToast(result.reason || (language === 'ar' ? 'المستخدم مسجل مسبقاً' : 'User already exists'), 'danger');
        return;
      }

      if (result.success && result.user) {
        showToast(
          language === 'ar'
            ? `تمت إضافة المستخدم (${manualDisplayName}) بنجاح`
            : `User (${manualDisplayName}) added successfully`,
          'success'
        );

        // Reset inputs
        setManualEmail('');
        setManualDisplayName('');
        setManualUsername('');
        setManualPassword('');
        setManualPhone('');

        // Immediate refresh from db.ts without full page reload (Requirement 3)
        const freshUsers = db.getTenantUsers(activeTenantId);
        setTenantUsers(freshUsers);
      }
    } catch {
      showToast(
        language === 'ar' ? 'حدث خطأ أثناء إضافة المستخدم' : 'Error adding user',
        'danger'
      );
    } finally {
      setIsAddingUser(false);
    }
  };

  // Box 3: Start Approve Delegate Request Modal (Rule 2.3: يوافق ويحدد الصلاحية ويسوي حفظ)
  const handleApproveRequest = (request: DelegateRequest) => {
    setApprovingReq(request);
    setApprovalRole('مندوب');
    setApprovalPreset('standard');
  };

  // Box 3: Confirm Approval and Save Permissions
  const handleConfirmApproval = () => {
    if (!approvingReq) return;

    const initialPerms: Partial<Record<SystemPageName, PermissionLevel>> = {};
    SYSTEM_PAGES.forEach(page => {
      if (approvalRole === 'ادمن') {
        initialPerms[page] = page === 'اشتراكي' ? 'مشاهدة' : 'يتحكم';
      } else if (approvalPreset === 'control_all') {
        initialPerms[page] = page === 'ميزان الصلاحيات' || page === 'اشتراكي' ? 'مخفي' : 'يتحكم';
      } else {
        // Standard delegate
        initialPerms[page] = page === 'ميزان الصلاحيات' || page === 'اعدادات' || page === 'اشتراكي' ? 'مخفي' : 'مشاهدة';
      }
    });

    const newUser = db.approveDelegateRequest(approvingReq.id, initialPerms);
    if (newUser) {
      if (approvalRole !== 'مندوب') {
        newUser.role = approvalRole;
        const allUsers = db.getTenantUsers(newUser.tenant_id);
        const idx = allUsers.findIndex(u => u.id === newUser.id);
        if (idx !== -1) {
          allUsers[idx].role = approvalRole;
        }
      }
      showToast(
        language === 'ar'
          ? `تمت الموافقة على المندوب (${approvingReq.name}) وتحديد صلاحياته وحفظه في ميزان الصلاحيات بنجاح`
          : `Delegate (${approvingReq.name}) approved with configured permissions`,
        'success'
      );
      setApprovingReq(null);
      reloadData(newUser.tenant_id);
    } else {
      showToast(
        language === 'ar' ? 'حدث خطأ أثناء الموافقة على الطلب' : 'Error approving request',
        'danger'
      );
    }
  };

  // Box 3: Reject Delegate Request
  const handleRejectRequest = (request: DelegateRequest) => {
    const success = db.rejectDelegateRequest(request.id);
    if (success) {
      showToast(
        language === 'ar' ? `تم رفض طلب المندوب ${request.name}` : `Rejected request from ${request.name}`,
        'info'
      );
      reloadData();
    }
  };

  // Helpers for localized display
  const getPageDisplayName = (page: SystemPageName): string => {
    if (language === 'ar') return page;
    const pageMap: Record<SystemPageName, string> = {
      'الرئيسية': 'Dashboard',
      'المبيعات': 'Sales',
      'الدفعات': 'Payments',
      'سجل الدفعات': 'Payment Logs',
      'المشتريات': 'Purchases',
      'مصاريف العمال': 'Staff Expenses',
      'قاعدة العملاء': 'Customers',
      'ادارة الطلبات': 'Orders',
      'ميزان الصلاحيات': 'Permissions',
      'منتجات': 'Products',
      'شركاء': 'Partners',
      'اعدادات': 'Settings',
      'اشتراكي': 'Subscription',
    };
    return pageMap[page] || page;
  };

  const getRoleDisplayName = (role: string): string => {
    if (language === 'ar') return role;
    if (role === 'مالك') return t('ownerRole', 'Owner');
    if (role === 'ادمن') return t('adminRole', 'Admin');
    if (role === 'مندوب') return t('delegateRole', 'Delegate');
    return role;
  };

  const getPermDisplayName = (perm: PermissionLevel): string => {
    if (language === 'ar') return perm;
    if (perm === 'حر') return t('permGoldFree', 'Full');
    if (perm === 'يتحكم') return t('permControl', 'Control');
    if (perm === 'مشاهدة') return t('permView', 'View');
    if (perm === 'مخفي') return t('permHidden', 'Hidden');
    return perm;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 sm:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 2.3 الهيدر مع زر اللغة قبل الشعار */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-[#2A2A2A] no-print">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Language Switch: Before logo in the header */}
          <LanguageToggle />

          <Logo size="sm" showSubtitle={false} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-[#D4AF37]">{t('appName')}</span>
              <span className="text-xs text-[#A0A0A0]">·</span>
              <span className="text-sm font-bold text-white">
                {t('matrixTitle')}
              </span>
            </div>
            <p className="text-xs text-[#A0A0A0] mt-0.5">
              {t('company')}: <strong className="text-[#D4AF37]">{currentStore?.store_name || activeStoreName}</strong> · {t('subscriptionNumber')}: <strong className="text-white font-mono">{currentStore?.subscription_id || activeSubscriptionId}</strong>
            </p>
          </div>
        </div>

        {/* Section 5 Buttons for Merchant Store & Store Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Store Switcher (if multiple stores registered) */}
          {allStores.length > 1 && (
            <div className="flex items-center gap-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-2.5 py-1 text-xs">
              <span className="text-[#A0A0A0] text-[11px]">{language === 'ar' ? 'المتجر:' : 'Store:'}</span>
              <select
                value={activeTenantId}
                onChange={(e) => reloadData(e.target.value)}
                className="bg-[#111111] border border-[#2A2A2A] text-[#D4AF37] font-bold rounded-lg px-2 py-0.5 text-xs outline-none cursor-pointer"
              >
                {allStores.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.store_name} ({s.subscription_id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Button 1: join/<STORE_SLUG> for company delegates */}
          <button
            onClick={handleCopyJoin}
            title={language === 'ar' ? 'انسخ رابط دعوة مندوب خاص بشركتك' : 'Copy company delegate invitation link'}
            className="py-2 px-3.5 bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] hover:border-[#D4AF37] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {copiedJoin ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4 text-[#D4AF37]" />}
            <span>{t('copyJoinLinkBtn')} (join/{currentStore?.store_slug || 'noor'})</span>
          </button>

          {/* Button 2: invite/NOOR for public NOOR */}
          <button
            onClick={handleCopyInvite}
            title={language === 'ar' ? 'انسخ رابط نشر متجر NOOR للناس' : 'Copy public NOOR store invitation link'}
            className="py-2 px-3.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37] text-[#D4AF37] text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {copiedInvite ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4 text-[#D4AF37]" />}
            <span>{t('copyInviteLinkBtn')}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mt-6 space-y-8">

        {/* المربع الرابع: سطر المالك التلقائي (توضيح القاعدة 2.4) */}
        <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">
                {t('ownerBannerTitle')}
              </h4>
              <p className="text-[#A0A0A0] mt-0.5">
                {t('ownerBannerDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <span className="px-3 py-1 bg-[#22C55E]/15 border border-[#22C55E] text-[#22C55E] font-bold rounded-lg text-[11px]">
              {t('legendControl')}
            </span>
            <span className="px-3 py-1 bg-[#38BDF8]/15 border border-[#38BDF8] text-[#38BDF8] font-bold rounded-lg text-[11px]">
              {t('legendView')}
            </span>
            <span className="px-3 py-1 bg-[#EF4444]/15 border border-[#EF4444] text-[#EF4444] font-bold rounded-lg text-[11px]">
              {t('legendHidden')}
            </span>
          </div>
        </div>

        {/* المربع الأول: جدول الصلاحيات 1450px يتسحب يمين ويسار والعمودين الأولين مثبتين */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-[#2A2A2A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-bold text-base text-white">
                {t('tableTitle')}
              </h3>
            </div>
            <span className="text-xs text-[#A0A0A0]">
              {t('tableHint')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: '1450px' }}>
              <table className="w-full border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-[#111111] border-b border-[#2A2A2A] text-[#A0A0A0] font-bold">
                    {/* عمود 1 مثبت: اسم المستخدم */}
                    <th 
                      style={{
                        position: 'sticky',
                        [isRtl ? 'right' : 'left']: 0,
                        width: '200px',
                        minWidth: '200px',
                        maxWidth: '200px',
                        zIndex: 20,
                      }}
                      className={`py-3.5 px-4 bg-[#111111] border-[#2A2A2A] shadow-md text-start ${isRtl ? 'border-l' : 'border-r'}`}
                    >
                      {t('thUsernameCol')}
                    </th>
                    {/* عمود 2 مثبت: الدور */}
                    <th 
                      style={{
                        position: 'sticky',
                        [isRtl ? 'right' : 'left']: '200px',
                        width: '120px',
                        minWidth: '120px',
                        maxWidth: '120px',
                        zIndex: 20,
                      }}
                      className={`py-3.5 px-4 bg-[#111111] border-[#2A2A2A] shadow-md text-start ${isRtl ? 'border-l' : 'border-r'}`}
                    >
                      {t('thRoleCol')}
                    </th>
                    {/* الـ 13 صفحة في النظام بالترتيب */}
                    {SYSTEM_PAGES.map(pageName => (
                      <th key={pageName} className="py-3.5 px-3 text-center border-l border-r border-[#2A2A2A]/40 min-w-[90px]">
                        {getPageDisplayName(pageName)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]/60">
                  {tenantUsers.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-[#A0A0A0]">
                        <p className="text-sm font-semibold text-white mb-1">
                          {language === 'ar' ? 'النظام يبدأ بنسخة نظيفة فاضية' : 'System starts clean and empty'}
                        </p>
                        <p className="text-xs text-[#A0A0A0]">
                          {language === 'ar' 
                            ? 'لم يتم إنشاء أي متجر بعد. يمكنك إنشاء متجرك عبر صفحة (register.html)' 
                            : 'No store created yet. You can create your store via register.html'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    tenantUsers.map((u) => {
                      const isOwner = u.role === 'مالك';

                      return (
                        <tr
                          key={u.id}
                          className={`transition-colors ${
                            isOwner ? 'bg-[#D4AF37]/5 font-bold' : 'hover:bg-[#222222]/60'
                          }`}
                        >
                          {/* 1. اسم المستخدم مثبت */}
                          <td
                            style={{
                              position: 'sticky',
                              [isRtl ? 'right' : 'left']: 0,
                              width: '200px',
                              minWidth: '200px',
                              maxWidth: '200px',
                              zIndex: 10,
                            }}
                            className={`py-3.5 px-4 border-[#2A2A2A] shadow-md ${isRtl ? 'border-l' : 'border-r'} ${
                              isOwner ? 'bg-[#151515] text-[#D4AF37]' : 'bg-[#1A1A1A] text-white font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isOwner ? (
                                <Lock className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                              ) : (
                                <Users className="w-3.5 h-3.5 text-[#A0A0A0] shrink-0" />
                              )}
                              <span className="font-semibold truncate">{u.display_name}</span>
                              <span className="text-[10px] text-[#A0A0A0] font-mono shrink-0">({u.username})</span>
                            </div>
                          </td>

                          {/* 2. الدور مثبت */}
                          <td
                            style={{
                              position: 'sticky',
                              [isRtl ? 'right' : 'left']: '200px',
                              width: '120px',
                              minWidth: '120px',
                              maxWidth: '120px',
                              zIndex: 10,
                            }}
                            className={`py-3.5 px-4 border-[#2A2A2A] shadow-md ${isRtl ? 'border-l' : 'border-r'} ${
                              isOwner ? 'bg-[#151515]' : 'bg-[#1A1A1A]'
                            }`}
                          >
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                isOwner
                                  ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                                  : u.role === 'ادمن'
                                  ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                                  : 'bg-[#2A2A2A] text-white'
                              }`}
                            >
                              {getRoleDisplayName(u.role)}
                            </span>
                          </td>

                          {/* 13 صفحة */}
                          {SYSTEM_PAGES.map(pageName => {
                            const perm: PermissionLevel = isOwner ? 'حر' : u.permissions?.[pageName] || 'مشاهدة';

                            return (
                              <td
                                key={pageName}
                                onClick={() => handleCellClick(u, pageName)}
                                className={`py-3 px-2 text-center border-l border-r border-[#2A2A2A]/40 transition-colors select-none ${
                                  isOwner
                                    ? 'cursor-not-allowed'
                                    : 'cursor-pointer hover:brightness-125'
                                }`}
                              >
                                {isOwner ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] font-black text-[11px] tracking-wide">
                                    <Lock className="w-3 h-3" />
                                    <span>{getPermDisplayName('حر')}</span>
                                  </span>
                                ) : perm === 'يتحكم' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#22C55E]/15 border border-[#22C55E]/50 text-[#22C55E] font-bold text-[11px]">
                                    <Sliders className="w-3 h-3" />
                                    <span>{getPermDisplayName('يتحكم')}</span>
                                  </span>
                                ) : perm === 'مشاهدة' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#38BDF8]/15 border border-[#38BDF8]/50 text-[#38BDF8] font-bold text-[11px]">
                                    <Eye className="w-3 h-3" />
                                    <span>{getPermDisplayName('مشاهدة')}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#EF4444]/15 border border-[#EF4444]/50 text-[#EF4444] font-bold text-[11px]">
                                    <EyeOff className="w-3 h-3" />
                                    <span>{getPermDisplayName('مخفي')}</span>
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Grid for Box 2 and Box 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* المربع الثاني: إضافة مستخدم جديد يدوي */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl">
            <div className="border-b border-[#2A2A2A] pb-3 mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#D4AF37]" />
                <span>{t('box2Title')}</span>
              </h3>
              <p className="text-xs text-[#A0A0A0] mt-1">
                {t('box2Desc')}
              </p>
            </div>

            <form onSubmit={handleAddManualUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* الاسم الظاهر */}
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    {t('displayName')} <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={manualDisplayName}
                    onChange={e => setManualDisplayName(e.target.value)}
                    placeholder={t('displayNamePlaceholder')}
                    className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2 px-3 text-xs outline-none"
                  />
                </div>

                {/* البريد الإلكتروني */}
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    {t('email')} <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={manualEmail}
                    onChange={e => setManualEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2 px-3 text-xs outline-none font-mono text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* اسم المستخدم للدخول */}
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    {t('usernameLogin')} <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={manualUsername}
                    onChange={e => setManualUsername(e.target.value)}
                    placeholder={t('usernamePlaceholder')}
                    className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2 px-3 text-xs outline-none font-mono text-left"
                  />
                </div>

                {/* كلمة المرور */}
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    {t('password')} <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={manualPassword}
                    onChange={e => setManualPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2 px-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* الدور: سهم تختار مندوب أو أدمن */}
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    {t('selectRole')} <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={manualRole}
                    onChange={e => setManualRole(e.target.value as 'مندوب' | 'ادمن')}
                    className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2 px-3 text-xs outline-none cursor-pointer"
                  >
                    <option value="مندوب">{t('roleDelegateOpt')}</option>
                    <option value="ادمن">{t('roleAdminOpt')}</option>
                  </select>
                </div>

                {/* رقم الجوال */}
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    {t('phone')} <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={manualPhone}
                    onChange={e => setManualPhone(e.target.value)}
                    placeholder={t('phonePlaceholder')}
                    className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2 px-3 text-xs outline-none font-mono text-left"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAddingUser}
                className="w-full py-2.5 px-4 bg-[#D4AF37] hover:bg-[#b8972c] active:scale-[0.99] text-[#0A0A0A] font-black text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{t('addUserBtn')}</span>
              </button>
            </form>
          </div>

          {/* المربع الثالث: ربط تسجيل مندوب تلقائياً (طلبات صفحة join) */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl">
            <div className="border-b border-[#2A2A2A] pb-3 mb-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#22C55E]" />
                  <span>{t('box3Title')}</span>
                </h3>
                <p className="text-xs text-[#A0A0A0] mt-1">
                  {t('box3Desc')}
                </p>
              </div>
              <span className="px-2.5 py-1 bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37] font-bold text-xs rounded-lg">
                {pendingRequests.length} {t('pendingCount')}
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-10 text-[#A0A0A0] border border-dashed border-[#2A2A2A] rounded-xl">
                  <Users className="w-8 h-8 mx-auto mb-2 text-[#2A2A2A]" />
                  <p className="text-xs">{t('noPendingRequests')}</p>
                  <p className="text-[11px] text-[#A0A0A0]/60 mt-1">
                    {t('noPendingHint')}
                  </p>
                </div>
              ) : (
                pendingRequests.map(req => (
                  <div
                    key={req.id}
                    className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{req.name}</span>
                        <span className="text-[10px] bg-[#2A2A2A] text-[#D4AF37] px-2 py-0.5 rounded font-mono">
                          {req.username}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A0A0A0] flex items-center gap-3">
                        <span className="font-mono" dir="ltr">{req.phone}</span>
                        <span>·</span>
                        <span className="font-mono">{req.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleApproveRequest(req)}
                        className="flex-1 sm:flex-none py-1.5 px-3 bg-[#22C55E] hover:bg-[#1ea34d] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{t('approveBtn')}</span>
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req)}
                        className="flex-1 sm:flex-none py-1.5 px-3 bg-[#2A2A2A] hover:bg-[#EF4444] text-[#A0A0A0] hover:text-white text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{t('rejectBtn')}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal: تعديل خلية الصلاحية عند الضغط عليها */}
      {activeCellEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative animate-fade-in">
            <h4 className="text-base font-bold text-white mb-1">
              {t('modalCellTitle')} ({getPageDisplayName(activeCellEdit.page)})
            </h4>
            <p className="text-xs text-[#A0A0A0] mb-5">
              {t('forUser')}: <strong className="text-white">{activeCellEdit.user.display_name}</strong>
            </p>

            <div className="flex flex-col gap-2.5 mb-5">
              {/* خيار 1: يتحكم (أخضر) */}
              <button
                type="button"
                onClick={() => setSelectedModalPerm('يتحكم')}
                className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-between cursor-pointer transition-all ${
                  selectedModalPerm === 'يتحكم'
                    ? 'bg-[#22C55E]/20 border-[#22C55E] text-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.25)]'
                    : 'bg-[#111111] border-[#2A2A2A] text-white hover:border-[#22C55E]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#22C55E]" />
                  <span>{t('optControlDesc')}</span>
                </div>
                {selectedModalPerm === 'يتحكم' && <Check className="w-4 h-4 text-[#22C55E]" />}
              </button>

              {/* خيار 2: مشاهدة (أزرق سماوي) */}
              <button
                type="button"
                onClick={() => setSelectedModalPerm('مشاهدة')}
                className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-between cursor-pointer transition-all ${
                  selectedModalPerm === 'مشاهدة'
                    ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8] shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                    : 'bg-[#111111] border-[#2A2A2A] text-white hover:border-[#38BDF8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#38BDF8]" />
                  <span>{t('optViewDesc')}</span>
                </div>
                {selectedModalPerm === 'مشاهدة' && <Check className="w-4 h-4 text-[#38BDF8]" />}
              </button>

              {/* خيار 3: مخفي (أحمر) */}
              <button
                type="button"
                onClick={() => setSelectedModalPerm('مخفي')}
                className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-between cursor-pointer transition-all ${
                  selectedModalPerm === 'مخفي'
                    ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                    : 'bg-[#111111] border-[#2A2A2A] text-white hover:border-[#EF4444]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-[#EF4444]" />
                  <span>{t('optHiddenDesc')}</span>
                </div>
                {selectedModalPerm === 'مخفي' && <Check className="w-4 h-4 text-[#EF4444]" />}
              </button>
            </div>

            {/* أزرار الحفظ والإلغاء (القاعدة 2.3: تختار وتسوي حفظ) */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSavePermission(selectedModalPerm)}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#b8972c] active:scale-[0.99] text-[#0A0A0A] font-black text-xs rounded-xl shadow-[0_4px_15px_rgba(212,175,55,0.25)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{language === 'ar' ? 'حفظ الصلاحية' : 'Save Permission'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCellEdit(null)}
                className="w-full py-2 bg-[#2A2A2A] text-[#A0A0A0] hover:text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* المربع الثالث: نافذة الموافقة على المندوب وتحديد الصلاحيات (القاعدة 2.3) */}
      {approvingReq && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border-2 border-[#22C55E] rounded-2xl max-w-md w-full p-6 text-start shadow-2xl relative animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-3 border-b border-[#2A2A2A] pb-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E] flex items-center justify-center text-[#22C55E] shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {language === 'ar' ? 'الموافقة على طلب المندوب وتحديد الصلاحيات' : 'Approve Delegate & Configure Permissions'}
                </h4>
                <p className="text-xs text-[#A0A0A0]">
                  {language === 'ar' ? 'القاعدة 2.3: صاحب الشركة يوافق ويحدد الصلاحية ويسوي حفظ' : 'Rule 2.3: Owner approves, assigns permission, and saves'}
                </p>
              </div>
            </div>

            {/* بيانات المندوب */}
            <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-3.5 space-y-2 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">{language === 'ar' ? 'اسم المندوب:' : 'Name:'}</span>
                <span className="font-bold text-white">{approvingReq.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">{language === 'ar' ? 'اسم المستخدم:' : 'Username:'}</span>
                <span className="font-mono text-[#D4AF37] font-bold">{approvingReq.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">{language === 'ar' ? 'رقم الجوال:' : 'Phone:'}</span>
                <span className="font-mono text-white" dir="ltr">{approvingReq.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">{language === 'ar' ? 'البريد الإلكتروني:' : 'Email:'}</span>
                <span className="font-mono text-white">{approvingReq.email}</span>
              </div>
            </div>

            {/* اختيار الدور */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-white mb-1.5">
                {language === 'ar' ? 'الدور في النظام:' : 'System Role:'}
              </label>
              <select
                value={approvalRole}
                onChange={(e) => setApprovalRole(e.target.value as 'مندوب' | 'ادمن')}
                className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#D4AF37] text-white rounded-xl py-2 px-3 text-xs outline-none cursor-pointer"
              >
                <option value="مندوب">{language === 'ar' ? 'مندوب (صلاحيات مخصصة)' : 'Delegate (Custom permissions)'}</option>
                <option value="ادمن">{language === 'ar' ? 'ادمن (صلاحيات تحكم كاملة)' : 'Admin (Full control)'}</option>
              </select>
            </div>

            {/* تحديد مستوى الصلاحيات */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-white mb-1.5">
                {language === 'ar' ? 'مستوى الصلاحيات المبدئي:' : 'Initial Permissions Level:'}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2.5 bg-[#111111] border border-[#2A2A2A] rounded-xl cursor-pointer hover:border-[#D4AF37] text-xs">
                  <input
                    type="radio"
                    name="preset"
                    checked={approvalPreset === 'standard'}
                    onChange={() => setApprovalPreset('standard')}
                    className="accent-[#D4AF37]"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      {language === 'ar' ? 'صلاحيات مندوب قياسية' : 'Standard Delegate'}
                    </span>
                    <span className="text-[11px] text-[#A0A0A0]">
                      {language === 'ar' ? 'مشاهدة للصفحات التشغيلية، ومخفي لـ (ميزان الصلاحيات، الإعدادات، اشتراكي)' : 'View operational pages, Hidden from Matrix, Settings, Subscription'}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-[#111111] border border-[#2A2A2A] rounded-xl cursor-pointer hover:border-[#D4AF37] text-xs">
                  <input
                    type="radio"
                    name="preset"
                    checked={approvalPreset === 'control_all'}
                    onChange={() => setApprovalPreset('control_all')}
                    className="accent-[#D4AF37]"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      {language === 'ar' ? 'صلاحيات تحكم كاملة (يتحكم)' : 'Full Control Permissions'}
                    </span>
                    <span className="text-[11px] text-[#A0A0A0]">
                      {language === 'ar' ? 'يتحكم بكافة الصفحات المصرح بها' : 'Control all authorized pages'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* زر الموافقة والحفظ */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="flex-1 py-3 bg-[#22C55E] hover:bg-[#1ea34d] active:scale-[0.99] text-white font-black text-xs rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{language === 'ar' ? 'تأكيد الموافقة وحفظ الصلاحية' : 'Confirm & Save Permissions'}</span>
              </button>
              <button
                type="button"
                onClick={() => setApprovingReq(null)}
                className="py-3 px-4 bg-[#2A2A2A] text-[#A0A0A0] hover:text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
