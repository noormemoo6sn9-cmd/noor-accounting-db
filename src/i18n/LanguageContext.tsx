import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
}

const STORAGE_KEY = 'noor_language';

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Top Bar & Navigation
    appName: 'NOOR',
    systemTitle: 'نظام حسابات وإدارة أعمال',
    sectionsLabel: 'الأقسام 1 و 2',
    navInvite: '1.1 رابط التاجر (invite/NOOR)',
    navRegister: '1.2 إنشاء متجر (register.html)',
    navSubscribers: '1.3 المشتركين (سوبر مالك)',
    navJoin: '2.1 رابط المندوب (join)',
    navPermissions: '2.3 ميزان الصلاحيات',
    navLogin: 'تسجيل الدخول (login.html)',
    langBtnArabic: 'عربي',
    langBtnEnglish: 'English',
    logout: 'تسجيل الخروج',
    welcome: 'مرحباً',

    // Common
    cancel: 'إلغاء',
    save: 'حفظ',
    confirm: 'تأكيد',
    close: 'إغلاق',
    search: 'بحث...',
    status: 'الحالة',
    actions: 'الإجراءات',
    active: 'نشط',
    suspended: 'موقوفة',
    freeTrial: '30 يوم مجانا',
    activated: 'مفعلة',
    copy: 'نسخ',
    copied: 'تم النسخ',
    delete: 'حذف',
    restore: 'استعادة',
    details: 'التفاصيل',
    loading: 'جاري التحميل...',
    noData: 'لا توجد بيانات',
    all: 'الكل',
    days: 'أيام',
    remaining: 'المتبقي',
    company: 'الشركة',
    subscriptionNumber: 'رقم الاشتراك',

    // Section 1.1 Invite Page
    heroTitle: 'نظام NOOR السحابي المتكامل',
    heroSubtitle: 'أقوى منصة سحابية لإدارة الحسابات، المبيعات، ونقاط البيع للمحلات والشركات',
    heroCta: 'ابدأ تجربتك المجانية (30 يوماً)',
    loginCta: 'تسجيل دخول تاجر / موظف',
    feature1Title: 'محاسبة متقدمة وفواتير ضريبية',
    feature1Desc: 'إصدار فواتير بيع وشراء وسندات قبض وصرف متوافقة مع متطلبات هيئة الزكاة والضريبة.',
    feature2Title: 'إدارة المخزون ونقاط البيع',
    feature2Desc: 'متابعة حركة الأصناف وجرد المستودعات مع شاشات بيع فائقة السرعة.',
    feature3Title: 'ميزان صلاحيات متعدد المستويات',
    feature3Desc: 'تحكم دقيق ومفصل بصلاحيات الموظفين والمندوبين لكل شاشة في النظام.',
    feature4Title: 'سحابي وآمن 100%',
    feature4Desc: 'بياناتك مشفرة ومحفوظة سحابياً، مع إمكانية الوصول من أي جهاز بأعلى معايير الأمان.',
    trialBanner: 'جرّب نظام NOOR مجاناً لمدة 30 يوماً كاملة بدون أي التزامات مالية أو بطاقة بنكية!',

    // Section 1.2 Register Page
    registerTitle: 'تسجيل مشترك جديد في NOOR',
    registerSubtitle: 'احصل على 30 يوماً مجاناً لتجربة كافة مميزات النظام بكامل طاقته',
    storeName: 'اسم المحل / الشركة',
    storeNamePlaceholder: 'مثال: شركة النور للتجارة',
    ownerName: 'اسم صاحب المحل الثلاثي',
    ownerNamePlaceholder: 'الاسم الكامل',
    phone: 'رقم الجوال (سعودي)',
    phonePlaceholder: '05xxxxxxxx',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'example@domain.com',
    username: 'اسم المستخدم للدخول',
    usernamePlaceholder: 'username',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    activityType: 'نوع النشاط التجاري',
    city: 'المدينة',
    cityPlaceholder: 'الرياض، جدة، الدمام...',
    planDuration: 'مدة الاشتراك بعد التجربة',
    plan1Month: 'شهر واحد',
    plan3Months: '3 أشهر',
    plan6Months: '6 أشهر',
    plan1Year: 'سنة واحدة',
    heardFrom: 'كيف تعرفت علينا؟ (اختياري)',
    sendOtp: 'إرسال رمز التحقق (OTP)',
    verifyOtp: 'تحقق من الرمز',
    verified: 'تم التحقق بنجاح',
    createStoreBtn: 'تفعيل المتجر وبدء التجربة المجانية',
    alreadyRegisteredTitle: 'حسابك مسجل أصلاً',
    alreadyRegisteredDesc: 'البيانات المدخلة مسجلة مسبقاً في النظام. يمكنك تسجيل الدخول مباشرة.',
    goToLogin: 'الانتقال لتسجيل الدخول',

    // Section 1.3 Subscribers Page (Super Owner)
    subscribersTitle: 'لوحة تحكم السوبر مالك - المشتركين',
    subscribersSubtitle: 'إدارة كافة المتاجر، تمديد الاشتراكات، وسلة المحذوفات',
    superOwnerNotice: 'هذه الصفحة خاصة بالسوبر مالك فقط. لا تظهر لأي تاجر أو موظف.',
    recycleBinBtn: 'سلة المحذوفات (30 يوم)',
    recycleBinModalTitle: 'سلة المحذوفات - الاحتفاظ لمدة 30 يوماً (القاعدة 7.10)',
    recycleBinEmpty: 'سلة المحذوفات فارغة حالياً',
    configureSuperOwner: 'إعداد حساب السوبر مالك',
    searchSubscriberPlaceholder: 'بحث باسم المتجر، المالك، رقم الجوال، أو رقم الاشتراك...',
    thSubId: 'رقم الاشتراك',
    thStore: 'المتجر / المالك',
    thContact: 'بيانات الاتصال',
    thPlan: 'الباقة والصلاحية',
    thStatus: 'الحالة',
    thDelegates: 'المندوبين',
    thActions: 'الإجراءات',
    extendBtn: 'تمديد',
    whatsappBtn: 'واتساب',
    confirmDeleteSubscriberTitle: 'تأكيد نقل المشترك إلى سلة المحذوفات',
    confirmDeleteSubscriberDesc: 'سيتم نقل المشترك إلى سلة المحذوفات لمدة 30 يوماً قبل الحذف النهائي وفق القاعدة 7.10، ويمكن استعادته خلال هذه المدة.',

    // Section 2.1 & 2.2 Join Page
    joinTitle: 'طلب انضمام مندوب / موظف',
    joinSubtitle: 'الانضمام إلى فريق عمل متجر',
    joinSuccessTitle: 'تم إرسال طلب الانضمام بنجاح',
    joinSuccessDesc: 'طلبك قيد المراجعة حالياً من قبل صاحب المتجر في ميزان الصلاحيات.',
    fullName: 'الاسم الكامل',
    submitJoinRequest: 'إرسال طلب الانضمام',

    // Section 2.3 & 2.4 Permissions Matrix Page
    matrixTitle: 'ميزان الصلاحيات والتحكم بالفريق',
    matrixSubtitle: 'التحكم الدقيق بصفحات النظام لكل مندوب ومستخدم داخل الشركة',
    ownerBannerTitle: 'سطر المالك التلقائي (القاعدة 2.4)',
    ownerBannerDesc: 'المالك يظهر تلقائياً في أول الجدول، دوره مالك، وكافة الصفحات حر ذهبي مقفل ولا يقبل التعديل.',
    legendControl: 'يتحكم: أخضر (كامل الصلاحيات)',
    legendView: 'مشاهدة: أزرق سماوي (عرض فقط)',
    legendHidden: 'مخفي: أحمر (مخفية كلياً)',
    copyJoinLinkBtn: 'انسخ رابط دعوة مندوب (join)',
    copyInviteLinkBtn: 'انسخ رابط نشر متجر NOOR (invite/NOOR)',
    tableTitle: 'جدول الصلاحيات العام (عرض 1450px مع تثبيت المستخدم والدور)',
    tableHint: 'اضغط على أي خلية للمندوب لتغيير صلاحيته (مشاهدة / يتحكم / مخفي)',
    thUsernameCol: 'اسم المستخدم',
    thRoleCol: 'الدور',
    ownerRole: 'مالك',
    adminRole: 'ادمن',
    delegateRole: 'مندوب',
    permGoldFree: 'حر',
    permControl: 'يتحكم',
    permView: 'مشاهدة',
    permHidden: 'مخفي',
    
    // Box 2: Manual User
    box2Title: 'المربع الثاني: إضافة مستخدم جديد يدوياً',
    box2Desc: 'إضافة مندوب أو أدمن مباشرة إلى فريق شركتك مع ظهور فوري في ميزان الصلاحيات',
    displayName: 'الاسم الظاهر',
    displayNamePlaceholder: 'الاسم الظاهر للمستخدم',
    usernameLogin: 'اسم المستخدم للدخول',
    selectRole: 'الدور',
    roleDelegateOpt: 'مندوب (صلاحيات مخصصة)',
    roleAdminOpt: 'ادمن (يتحكم بكافة الصفحات ما عدا اشتراكي)',
    addUserBtn: 'إضافة مستخدم وتثبيته في الجدول فوراً',

    // Box 3: Join Requests
    box3Title: 'المربع الثالث: طلبات انضمام المندوبين (join)',
    box3Desc: 'الطلبات الواردة من رابط دعوة المندوبين الخاص بمتجرك',
    pendingCount: 'طلبات معلقة',
    noPendingRequests: 'لا توجد طلبات انضمام معلقة حالياً',
    noPendingHint: 'عندما يسجل مندوب من رابط join الخاص بشركتك سيظهر طلبه هنا للموافقة',
    approveBtn: 'موافقة',
    rejectBtn: 'رفض',

    // Edit Cell Modal
    modalCellTitle: 'تحديد صلاحية صفحة',
    forUser: 'للمستخدم',
    optControlDesc: 'يتحكم (كامل الإجراءات والتعديل)',
    optViewDesc: 'مشاهدة (عرض البيانات بدون تعديل)',
    optHiddenDesc: 'مخفي (لا تظهر الصفحة ولا حتى اسمها)',

    // Login Page
    loginTitle: 'تسجيل الدخول إلى NOOR',
    loginSubtitle: 'ادخل بيانات حسابك للوصول إلى لوحة التحكم',
    loginIdentifier: 'اسم المستخدم أو البريد أو الجوال',
    loginIdentifierPlaceholder: 'ادخل اسم المستخدم أو البريد أو الجوال',
    loginBtn: 'تسجيل الدخول',
    forgotPassword: 'نسيت كلمة المرور؟',
    registerNewStoreLink: 'ليس لديك حساب؟ افتح متجرك الآن مجاناً',
  },
  en: {
    // Top Bar & Navigation
    appName: 'NOOR',
    systemTitle: 'Accounting & Business Management System',
    sectionsLabel: 'Sections 1 & 2',
    navInvite: '1.1 Merchant Link (invite/NOOR)',
    navRegister: '1.2 Create Store (register.html)',
    navSubscribers: '1.3 Subscribers (Super Owner)',
    navJoin: '2.1 Delegate Link (join)',
    navPermissions: '2.3 Permissions Matrix',
    navLogin: 'Login (login.html)',
    langBtnArabic: 'عربي',
    langBtnEnglish: 'English',
    logout: 'Log Out',
    welcome: 'Welcome',

    // Common
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
    close: 'Close',
    search: 'Search...',
    status: 'Status',
    actions: 'Actions',
    active: 'Active',
    suspended: 'Suspended',
    freeTrial: '30-Day Free Trial',
    activated: 'Active',
    copy: 'Copy',
    copied: 'Copied',
    delete: 'Delete',
    restore: 'Restore',
    details: 'Details',
    loading: 'Loading...',
    noData: 'No Data Available',
    all: 'All',
    days: 'Days',
    remaining: 'Remaining',
    company: 'Company',
    subscriptionNumber: 'Subscription ID',

    // Section 1.1 Invite Page
    heroTitle: 'NOOR Integrated Cloud Platform',
    heroSubtitle: 'The Ultimate Cloud Accounting, Sales, and POS Management Solution for Businesses',
    heroCta: 'Start Your Free 30-Day Trial',
    loginCta: 'Merchant & Staff Login',
    feature1Title: 'Advanced Accounting & Tax Invoicing',
    feature1Desc: 'Issue sales and purchase invoices, payment receipts, and vouchers compliant with ZATCA regulations.',
    feature2Title: 'Inventory & POS Control',
    feature2Desc: 'Track warehouse items, stock movements, and run ultra-fast POS checkout terminals.',
    feature3Title: 'Multi-Tier Permissions Matrix',
    feature3Desc: 'Granular access control per system screen for delegates, admins, and staff members.',
    feature4Title: '100% Cloud & Enterprise Secure',
    feature4Desc: 'Encrypted cloud storage with bank-grade security accessible anywhere from any modern device.',
    trialBanner: 'Try NOOR free for 30 full days with zero commitments and no credit card required!',

    // Section 1.2 Register Page
    registerTitle: 'Register New Business on NOOR',
    registerSubtitle: 'Get a 30-day free trial with full access to all system features',
    storeName: 'Store / Company Name',
    storeNamePlaceholder: 'e.g. Noor Trading Co.',
    ownerName: 'Owner Full Name',
    ownerNamePlaceholder: 'Full Name',
    phone: 'Phone Number (Saudi Arabia)',
    phonePlaceholder: '05xxxxxxxx',
    email: 'Email Address',
    emailPlaceholder: 'example@domain.com',
    username: 'Login Username',
    usernamePlaceholder: 'username',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    activityType: 'Business Activity Type',
    city: 'City',
    cityPlaceholder: 'Riyadh, Jeddah, Dammam...',
    planDuration: 'Subscription Plan After Trial',
    plan1Month: '1 Month',
    plan3Months: '3 Months',
    plan6Months: '6 Months',
    plan1Year: '1 Year',
    heardFrom: 'How did you hear about us? (Optional)',
    sendOtp: 'Send OTP Verification Code',
    verifyOtp: 'Verify Code',
    verified: 'Successfully Verified',
    createStoreBtn: 'Activate Store & Start Free Trial',
    alreadyRegisteredTitle: 'Account Already Exists',
    alreadyRegisteredDesc: 'These credentials are already registered in NOOR. You can log in directly.',
    goToLogin: 'Proceed to Login',

    // Section 1.3 Subscribers Page (Super Owner)
    subscribersTitle: 'Super Owner Dashboard - Subscribers',
    subscribersSubtitle: 'Manage all stores, extend subscriptions, and 30-day recycle bin',
    superOwnerNotice: 'This page is strictly reserved for Super Owner. Hidden from merchants and staff.',
    recycleBinBtn: 'Recycle Bin (30 Days)',
    recycleBinModalTitle: 'Recycle Bin - 30-Day Retention (Rule 7.10)',
    recycleBinEmpty: 'Recycle bin is currently empty',
    configureSuperOwner: 'Configure Super Owner Account',
    searchSubscriberPlaceholder: 'Search by store name, owner, phone, or subscription ID...',
    thSubId: 'Subscription ID',
    thStore: 'Store / Owner',
    thContact: 'Contact Info',
    thPlan: 'Plan & Expiry',
    thStatus: 'Status',
    thDelegates: 'Delegates',
    thActions: 'Actions',
    extendBtn: 'Extend',
    whatsappBtn: 'WhatsApp',
    confirmDeleteSubscriberTitle: 'Confirm Move to 30-Day Recycle Bin',
    confirmDeleteSubscriberDesc: 'The subscriber will be moved to the 30-day Recycle Bin before permanent deletion per Rule 7.10, and can be restored at any time during this period.',

    // Section 2.1 & 2.2 Join Page
    joinTitle: 'Delegate / Staff Join Request',
    joinSubtitle: 'Join a store business team',
    joinSuccessTitle: 'Join Request Submitted Successfully',
    joinSuccessDesc: 'Your request is currently pending review by the store owner in the Permissions Matrix.',
    fullName: 'Full Name',
    submitJoinRequest: 'Submit Join Request',

    // Section 2.3 & 2.4 Permissions Matrix Page
    matrixTitle: 'Permissions Matrix & Team Control',
    matrixSubtitle: 'Granular access control per system screen for each delegate and company member',
    ownerBannerTitle: 'Automatic Owner Row (Rule 2.4)',
    ownerBannerDesc: 'The owner always appears at position 0, role Owner, and all pages are Gold Locked Full Access.',
    legendControl: 'Control: Green (Full actions & edits)',
    legendView: 'View: Sky Blue (Read-only view)',
    legendHidden: 'Hidden: Red (Completely invisible)',
    copyJoinLinkBtn: 'Copy Delegate Invitation Link (join)',
    copyInviteLinkBtn: 'Copy NOOR Store Invitation Link (invite/NOOR)',
    tableTitle: 'Universal Permissions Matrix (1450px with pinned user & role)',
    tableHint: 'Click any cell for a delegate to toggle permission (View / Control / Hidden)',
    thUsernameCol: 'Username',
    thRoleCol: 'Role',
    ownerRole: 'Owner',
    adminRole: 'Admin',
    delegateRole: 'Delegate',
    permGoldFree: 'Full',
    permControl: 'Control',
    permView: 'View',
    permHidden: 'Hidden',

    // Box 2: Manual User
    box2Title: 'Box 2: Add Manual User',
    box2Desc: 'Add a delegate or admin directly to your company team with immediate table appearance',
    displayName: 'Display Name',
    displayNamePlaceholder: 'User Display Name',
    usernameLogin: 'Login Username',
    selectRole: 'Role',
    roleDelegateOpt: 'Delegate (Custom permissions)',
    roleAdminOpt: 'Admin (Controls all pages except My Subscription)',
    addUserBtn: 'Add User & Display Instantly in Table',

    // Box 3: Join Requests
    box3Title: 'Box 3: Delegate Join Requests (join)',
    box3Desc: 'Pending registration requests received from your store invitation link',
    pendingCount: 'Pending Requests',
    noPendingRequests: 'No pending requests at this time',
    noPendingHint: 'When a delegate registers through your store join link, their request will appear here',
    approveBtn: 'Approve',
    rejectBtn: 'Reject',

    // Edit Cell Modal
    modalCellTitle: 'Set Page Permission',
    forUser: 'For user',
    optControlDesc: 'Control (Full create, edit, and delete actions)',
    optViewDesc: 'View (Read data without edit rights)',
    optHiddenDesc: 'Hidden (Page and menu item are completely hidden)',

    // Login Page
    loginTitle: 'Log in to NOOR',
    loginSubtitle: 'Enter your credentials to access the management portal',
    loginIdentifier: 'Username, Email, or Phone Number',
    loginIdentifierPlaceholder: 'Enter your username, email, or phone',
    loginBtn: 'Sign In',
    forgotPassword: 'Forgot Password?',
    registerNewStoreLink: 'Don\'t have an account? Open your store now for free',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ar') return saved;
    } catch {}
    return 'ar'; // Default Arabic
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const isRtl = language === 'ar';
  const dir: 'rtl' | 'ltr' = isRtl ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = dir;
      document.documentElement.lang = language;
    }
  }, [language, dir]);

  const t = (key: string, defaultText?: string): string => {
    return translations[language]?.[key] || defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, dir, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
