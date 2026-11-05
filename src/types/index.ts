export type ActivityType = 'محل خردوات' | 'موزع جملة' | 'ورشة' | 'تاجر';

export type PlanDuration = 'شهر' | '3 شهور' | 'سنة';

export type SubscriberStatus = 'مفعلة' | '30 يوم مجانا' | 'منتهية' | 'موقوفة';

export type UserRole = 'مالك' | 'ادمن' | 'مندوب' | 'سوبر مالك';

export interface Subscriber {
  id: string; // Tenant ID
  subscription_id: string; // Fixed, e.g. NOOR-SUB-829104
  store_name: string; // اسم المحل / الشركة
  owner_name: string; // اسم صاحب المحل
  phone: string; // رقم الجوال
  email: string; // البريد الالكتروني
  username: string; // اسم المستخدم
  password_hash: string; // مشفرة
  activity_type: ActivityType; // نوع النشاط
  city: string; // المدينة
  plan_duration: PlanDuration; // المدة
  heard_from?: string; // كيف عرفت عنا
  created_at: string; // تاريخ الاشتراك
  expires_at: string; // تاريخ الانتهاء
  status: SubscriberStatus; // الحالة
  store_slug: string; // رابط نسختها الخاصة
  delegates_count: number; // عدد المندوبين تحتها
  sales_summary?: {
    total_sales: number;
    invoices_count: number;
    paid_amount: number;
    remaining_amount: number;
  };
}

export type PermissionLevel = 'يتحكم' | 'مشاهدة' | 'مخفي' | 'حر';

export const SYSTEM_PAGES = [
  'الرئيسية',
  'المبيعات',
  'الدفعات',
  'سجل الدفعات',
  'المشتريات',
  'مصاريف العمال',
  'قاعدة العملاء',
  'ادارة الطلبات',
  'ميزان الصلاحيات',
  'منتجات',
  'شركاء',
  'اعدادات',
  'اشتراكي',
] as const;

export type SystemPageName = typeof SYSTEM_PAGES[number];

export interface User {
  id: string;
  tenant_id: string;
  username: string;
  email: string;
  phone: string;
  display_name: string;
  role: UserRole;
  password_hash: string;
  status: 'نشط' | 'موقوف';
  created_at: string;
  permissions?: Partial<Record<SystemPageName, PermissionLevel>>;
}

export interface DelegateRequest {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email: string;
  username: string;
  password_hash: string;
  store_slug: string;
  status: 'معلق' | 'موافق' | 'مرفوض';
  created_at: string;
}


export interface OTPRecord {
  code: string;
  target: string; // phone or email
  type: 'phone' | 'email';
  expires_at: number; // timestamp
  verified: boolean;
}

export interface ActivityLog {
  id: string;
  tenant_id: string;
  user_name: string;
  action_type: 'دخول' | 'حذف' | 'تعديل' | 'اضافة' | 'دخول فاشل';
  details: string;
  device: string;
  ip: string;
  timestamp: string;
  subscription_id: string;
  store_name: string;
}
