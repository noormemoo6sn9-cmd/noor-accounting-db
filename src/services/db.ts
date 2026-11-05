import { 
  Subscriber, 
  User, 
  ActivityLog, 
  OTPRecord, 
  ActivityType, 
  PlanDuration,
  DelegateRequest,
  PermissionLevel,
  SystemPageName,
  SYSTEM_PAGES
} from '../types';

const STORAGE_KEYS = {
  SUBSCRIBERS: 'noor_subscribers_data',
  USERS: 'noor_users_data',
  LOGS: 'noor_activity_logs',
  OTPS: 'noor_otp_records',
  SUPER_OWNER: 'noor_super_owner_config',
  CURRENT_SESSION: 'noor_current_session',
  SETTINGS: 'noor_system_settings',
  DELEGATE_REQUESTS: 'noor_delegate_requests',
  RECYCLE_BIN: 'noor_recycle_bin',
};

export interface RecycledSubscriber {
  id: string; // Tenant ID
  subscriber: Subscriber;
  users: User[];
  deleted_at: string;
  purge_at: string; // 30 days retention
}

export interface SuperOwnerConfig {
  email: string;
  password_hash: string;
  is_configured: boolean;
}

// Simple SHA-256 equivalent for browser client
export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate unique subscription ID in format: NOOR-SUB-XXXXXX
export function generateSubscriptionId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `NOOR-SUB-${randomNum}`;
}

// Generate unique tenant ID
export function generateTenantId(): string {
  return `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage quota exceeded or error saving to localStorage', e);
    }
  }

  // Super Owner (no hardcoded email in code, configured securely by the owner in UI)
  getSuperOwner(): SuperOwnerConfig {
    return this.get<SuperOwnerConfig>(STORAGE_KEYS.SUPER_OWNER, {
      email: '',
      password_hash: '',
      is_configured: false,
    });
  }

  setSuperOwner(config: SuperOwnerConfig): void {
    this.set(STORAGE_KEYS.SUPER_OWNER, config);
  }

  // Subscribers
  getSubscribers(): Subscriber[] {
    return this.get<Subscriber[]>(STORAGE_KEYS.SUBSCRIBERS, []);
  }

  getSubscriberByTenantId(tenantId: string): Subscriber | undefined {
    return this.getSubscribers().find(s => s.id === tenantId);
  }

  getSubscriberBySubscriptionId(subId: string): Subscriber | undefined {
    return this.getSubscribers().find(s => s.subscription_id === subId);
  }

  // Authoritative resolver for company/subscriber across all components
  resolveSubscriber(identifier?: string): Subscriber | undefined {
    const subscribers = this.getSubscribers();
    if (subscribers.length === 0) return undefined;

    if (identifier && identifier !== 'NOOR') {
      const clean = identifier.trim().toLowerCase();
      // 1. By id (tenant_id)
      const byId = subscribers.find(s => s.id === identifier);
      if (byId) return byId;

      // 2. By subscription_id
      const bySubId = subscribers.find(s => s.subscription_id.toLowerCase() === clean);
      if (bySubId) return bySubId;

      // 3. By slug or store_name
      const bySlug = subscribers.find(
        s => s.store_slug.toLowerCase() === clean || s.store_name.toLowerCase() === clean
      );
      if (bySlug) return bySlug;
    }

    // 4. By active session tenantId
    const session = this.getCurrentSession();
    if (session.tenantId && session.tenantId !== 'NOOR') {
      const bySession = subscribers.find(s => s.id === session.tenantId);
      if (bySession) return bySession;
    }

    // 5. Default to the current active subscriber (first registered store)
    return subscribers[0];
  }

  // Get active tenant context ensuring 100% consistency between saving and displaying
  getActiveTenantContext(preferredTenantId?: string): {
    tenantId: string;
    subscriptionId: string;
    storeName: string;
    subscriber?: Subscriber;
  } {
    // 1. Try resolving subscriber
    const sub = this.resolveSubscriber(preferredTenantId);
    if (sub) {
      return {
        tenantId: sub.id,
        subscriptionId: sub.subscription_id,
        storeName: sub.store_name,
        subscriber: sub,
      };
    }

    // 2. Try session
    const session = this.getCurrentSession();
    if (session.tenantId && session.tenantId !== 'NOOR') {
      return {
        tenantId: session.tenantId,
        subscriptionId: session.subscriptionId || 'NOOR-HQ',
        storeName: session.storeName || 'NOOR',
      };
    }

    // 3. Check existing users in storage
    const users = this.get<User[]>(STORAGE_KEYS.USERS, []);
    const userWithTenant = users.find(u => u.tenant_id && u.tenant_id !== 'NOOR');
    if (userWithTenant) {
      return {
        tenantId: userWithTenant.tenant_id,
        subscriptionId: 'NOOR-HQ',
        storeName: 'متجر NOOR',
      };
    }

    // 4. Default persistent company ID
    return {
      tenantId: 'tenant_noor_main',
      subscriptionId: 'NOOR-HQ',
      storeName: 'متجر NOOR',
    };
  }

  // Check if phone, email, or username is already registered (Rule 3.6)
  checkAccountExists(identifier: string): { exists: boolean; field?: 'email' | 'phone' | 'username'; subscriber?: Subscriber } {
    const cleanId = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/\D/g, '');
    const subscribers = this.getSubscribers();

    for (const sub of subscribers) {
      if (sub.email.toLowerCase() === cleanId) {
        return { exists: true, field: 'email', subscriber: sub };
      }
      if (sub.username.toLowerCase() === cleanId) {
        return { exists: true, field: 'username', subscriber: sub };
      }
      const subPhoneDigits = sub.phone.replace(/\D/g, '');
      if (cleanDigits && subPhoneDigits && (subPhoneDigits.includes(cleanDigits) || cleanDigits.includes(subPhoneDigits))) {
        return { exists: true, field: 'phone', subscriber: sub };
      }
    }

    return { exists: false };
  }

  // Create new Subscriber (Section 1.2)
  async createSubscriber(data: {
    store_name: string;
    owner_name: string;
    phone: string;
    email: string;
    username: string;
    password: string;
    activity_type: ActivityType;
    city: string;
    plan_duration: PlanDuration;
    heard_from?: string;
  }): Promise<{ subscriber: Subscriber; user: User }> {
    const tenantId = generateTenantId();
    const subscriptionId = generateSubscriptionId();
    const passwordHash = await hashPassword(data.password);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days free

    const cleanSlug = data.store_name
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\u0621-\u064A]+/g, '-')
      .replace(/^-+|-+$/g, '') || `store-${Date.now()}`;

    const subscriber: Subscriber = {
      id: tenantId,
      subscription_id: subscriptionId,
      store_name: data.store_name.trim(),
      owner_name: data.owner_name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      username: data.username.trim(),
      password_hash: passwordHash,
      activity_type: data.activity_type,
      city: data.city.trim(),
      plan_duration: data.plan_duration,
      heard_from: data.heard_from?.trim(),
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: '30 يوم مجانا',
      store_slug: cleanSlug,
      delegates_count: 0,
      sales_summary: {
        total_sales: 0,
        invoices_count: 0,
        paid_amount: 0,
        remaining_amount: 0,
      },
    };

    // Rule 2.4 & Golden Rule: Create corresponding single owner user in the same tenant
    const ownerUser: User = {
      id: `usr_${Date.now()}`,
      tenant_id: tenantId,
      username: data.username.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      display_name: data.owner_name.trim(),
      role: 'مالك',
      password_hash: passwordHash,
      status: 'نشط',
      created_at: now.toISOString(),
    };

    const subscribers = this.getSubscribers();
    subscribers.push(subscriber);
    this.set(STORAGE_KEYS.SUBSCRIBERS, subscribers);

    const users = this.get<User[]>(STORAGE_KEYS.USERS, []);
    users.push(ownerUser);
    this.set(STORAGE_KEYS.USERS, users);

    this.logActivity({
      tenant_id: tenantId,
      user_name: data.username,
      action_type: 'اضافة',
      details: `تسجيل متجر جديد ${data.store_name} برقم اشتراك ${subscriptionId}`,
      subscription_id: subscriptionId,
      store_name: data.store_name,
    });

    return { subscriber, user: ownerUser };
  }

  // Toggle subscriber status (Active <-> Suspended)
  toggleSubscriberStatus(tenantId: string): Subscriber | null {
    const subscribers = this.getSubscribers();
    const index = subscribers.findIndex(s => s.id === tenantId);
    if (index === -1) return null;

    const currentStatus = subscribers[index].status;
    const newStatus = currentStatus === 'موقوفة' ? 'مفعلة' : 'موقوفة';
    subscribers[index].status = newStatus;

    this.set(STORAGE_KEYS.SUBSCRIBERS, subscribers);

    this.logActivity({
      tenant_id: tenantId,
      user_name: 'السوبر مالك',
      action_type: 'تعديل',
      details: `تغيير حالة الشركة ${subscribers[index].store_name} الى ${newStatus}`,
      subscription_id: subscribers[index].subscription_id,
      store_name: subscribers[index].store_name,
    });

    return subscribers[index];
  }

  // Extend subscriber subscription (Golden Rule 6: keep same tenant_id and same subscription_id)
  extendSubscriber(tenantId: string, days: number): Subscriber | null {
    const subscribers = this.getSubscribers();
    const index = subscribers.findIndex(s => s.id === tenantId);
    if (index === -1) return null;

    const sub = subscribers[index];
    const currentExpiry = new Date(sub.expires_at);
    const now = new Date();
    // If already expired, extend from now; if still active, extend from current expiry
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    sub.expires_at = newExpiry.toISOString();
    sub.status = 'مفعلة';

    this.set(STORAGE_KEYS.SUBSCRIBERS, subscribers);

    this.logActivity({
      tenant_id: tenantId,
      user_name: 'السوبر مالك',
      action_type: 'تعديل',
      details: `تمديد اشتراك شركة ${sub.store_name} بـ ${days} يوم حتى ${newExpiry.toLocaleDateString('ar-SA')}`,
      subscription_id: sub.subscription_id,
      store_name: sub.store_name,
    });

    return sub;
  }

  // Delete subscriber: Moves to 30-day Recycle Bin (Golden Rule 5 & Section 7.10)
  deleteSubscriber(tenantId: string): boolean {
    const subscribers = this.getSubscribers();
    const sub = subscribers.find(s => s.id === tenantId);
    if (!sub) return false;

    // Remove from active subscribers list
    const updatedSubscribers = subscribers.filter(s => s.id !== tenantId);
    this.set(STORAGE_KEYS.SUBSCRIBERS, updatedSubscribers);

    // Get and remove tenant users from active list
    const users = this.get<User[]>(STORAGE_KEYS.USERS, []);
    const tenantUsers = users.filter(u => u.tenant_id === tenantId);
    const updatedUsers = users.filter(u => u.tenant_id !== tenantId);
    this.set(STORAGE_KEYS.USERS, updatedUsers);

    // Move to 30-day Recycle Bin (Rule 7.10: ينحفظ الحذف 30 يوم في سلة المحذوفات)
    const now = new Date();
    const purgeDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const recycleBin = this.get<RecycledSubscriber[]>(STORAGE_KEYS.RECYCLE_BIN, []);

    // Filter out previous entries if any
    const filteredBin = recycleBin.filter(item => item.id !== tenantId);
    filteredBin.push({
      id: tenantId,
      subscriber: sub,
      users: tenantUsers,
      deleted_at: now.toISOString(),
      purge_at: purgeDate.toISOString(),
    });
    this.set(STORAGE_KEYS.RECYCLE_BIN, filteredBin);

    this.logActivity({
      tenant_id: tenantId,
      user_name: 'السوبر مالك',
      action_type: 'حذف',
      details: `نقل شركة ${sub.store_name} برقم اشتراك ${sub.subscription_id} إلى سلة المحذوفات (حفظ لمدة 30 يوم قبل الحذف النهائي)`,
      subscription_id: sub.subscription_id,
      store_name: sub.store_name,
    });

    return true;
  }

  // Get active items in 30-day Recycle Bin (with automatic purge of entries older than 30 days)
  getRecycleBin(): RecycledSubscriber[] {
    const recycleBin = this.get<RecycledSubscriber[]>(STORAGE_KEYS.RECYCLE_BIN, []);
    const now = Date.now();
    // Auto-purge items past 30 days
    const active = recycleBin.filter(item => new Date(item.purge_at).getTime() > now);
    if (active.length !== recycleBin.length) {
      this.set(STORAGE_KEYS.RECYCLE_BIN, active);
    }
    return active;
  }

  // Restore subscriber from 30-day Recycle Bin
  restoreSubscriber(tenantId: string): boolean {
    const recycleBin = this.get<RecycledSubscriber[]>(STORAGE_KEYS.RECYCLE_BIN, []);
    const item = recycleBin.find(r => r.id === tenantId);
    if (!item) return false;

    // Restore subscriber
    const subscribers = this.getSubscribers();
    subscribers.push(item.subscriber);
    this.set(STORAGE_KEYS.SUBSCRIBERS, subscribers);

    // Restore users
    const users = this.get<User[]>(STORAGE_KEYS.USERS, []);
    users.push(...item.users);
    this.set(STORAGE_KEYS.USERS, users);

    // Remove from recycle bin
    const updatedBin = recycleBin.filter(r => r.id !== tenantId);
    this.set(STORAGE_KEYS.RECYCLE_BIN, updatedBin);

    this.logActivity({
      tenant_id: tenantId,
      user_name: 'السوبر مالك',
      action_type: 'اضافة',
      details: `استعادة شركة ${item.subscriber.store_name} برقم اشتراك ${item.subscriber.subscription_id} من سلة المحذوفات`,
      subscription_id: item.subscriber.subscription_id,
      store_name: item.subscriber.store_name,
    });

    return true;
  }

  // OTP Service (Real 6-digit verification code with 5-minute expiry)
  generateOTP(target: string, type: 'phone' | 'email'): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const otps = this.get<OTPRecord[]>(STORAGE_KEYS.OTPS, []);
    
    // Clean old OTPs for same target
    const filtered = otps.filter(o => o.target !== target);
    filtered.push({
      code,
      target,
      type,
      expires_at: Date.now() + 5 * 60 * 1000, // 5 minutes
      verified: false,
    });

    this.set(STORAGE_KEYS.OTPS, filtered);
    return code;
  }

  verifyOTP(target: string, inputCode: string): boolean {
    const otps = this.get<OTPRecord[]>(STORAGE_KEYS.OTPS, []);
    const record = otps.find(o => o.target === target && o.code === inputCode.trim());
    
    if (!record) return false;
    if (Date.now() > record.expires_at) return false;

    record.verified = true;
    this.set(STORAGE_KEYS.OTPS, otps);
    return true;
  }

  isTargetVerified(target: string): boolean {
    const otps = this.get<OTPRecord[]>(STORAGE_KEYS.OTPS, []);
    const record = otps.find(o => o.target === target && o.verified);
    return !!record;
  }

  // Activity Log
  logActivity(data: {
    tenant_id: string;
    user_name: string;
    action_type: 'دخول' | 'حذف' | 'تعديل' | 'اضافة' | 'دخول فاشل';
    details: string;
    subscription_id: string;
    store_name: string;
  }): void {
    const logs = this.get<ActivityLog[]>(STORAGE_KEYS.LOGS, []);
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device';
    const device = /iphone|ipad|ipod/i.test(userAgent)
      ? 'ايفون'
      : /android/i.test(userAgent)
      ? 'اندرويد'
      : 'كمبيوتر';

    const log: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: data.tenant_id,
      user_name: data.user_name,
      action_type: data.action_type,
      details: data.details,
      device,
      ip: '127.0.0.1 (محلي)',
      timestamp: new Date().toISOString(),
      subscription_id: data.subscription_id,
      store_name: data.store_name,
    };

    logs.unshift(log);
    // keep max 500 logs
    if (logs.length > 500) logs.pop();
    this.set(STORAGE_KEYS.LOGS, logs);
  }

  getActivityLogs(tenantId?: string): ActivityLog[] {
    const logs = this.get<ActivityLog[]>(STORAGE_KEYS.LOGS, []);
    if (!tenantId) return logs;
    return logs.filter(l => l.tenant_id === tenantId);
  }

  // Session & Authentication
  getCurrentSession(): {
    isLoggedIn: boolean;
    isSuperOwner: boolean;
    tenantId?: string;
    username?: string;
    role?: string;
    storeName?: string;
    subscriptionId?: string;
  } {
    return this.get(STORAGE_KEYS.CURRENT_SESSION, {
      isLoggedIn: false,
      isSuperOwner: false,
    });
  }

  setCurrentSession(session: {
    isLoggedIn: boolean;
    isSuperOwner: boolean;
    tenantId?: string;
    username?: string;
    role?: string;
    storeName?: string;
    subscriptionId?: string;
  }): void {
    this.set(STORAGE_KEYS.CURRENT_SESSION, session);
  }

  clearSession(): void {
    this.set(STORAGE_KEYS.CURRENT_SESSION, {
      isLoggedIn: false,
      isSuperOwner: false,
    });
  }

  // Section 2: Look up subscriber by slug for join/<STORE_SLUG>
  getSubscriberBySlug(slug: string): Subscriber | { id: string; store_name: string; subscription_id: string; store_slug: string } | undefined {
    const cleanSlug = slug.trim().toLowerCase();
    if (cleanSlug === 'noor') {
      return {
        id: 'NOOR',
        store_name: 'NOOR',
        subscription_id: 'NOOR-HQ',
        store_slug: 'noor',
      };
    }
    const subscribers = this.getSubscribers();
    return subscribers.find(s => s.store_slug.toLowerCase() === cleanSlug || s.store_name.toLowerCase() === cleanSlug);
  }

  // Section 2: Check if delegate or user is already registered across the whole system (Rule 3.6)
  checkUserOrDelegateExists(identifier: string): { exists: boolean; reason?: string } {
    const clean = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/\D/g, '');

    // Check subscribers
    const subCheck = this.checkAccountExists(identifier);
    if (subCheck.exists) {
      return { 
        exists: true, 
        reason: subCheck.field === 'email' ? 'البريد الالكتروني مسجل مسبقاً' : subCheck.field === 'phone' ? 'رقم الجوال مسجل مسبقاً' : 'اسم المستخدم مسجل مسبقاً' 
      };
    }

    // Check existing users
    const users = this.get<User[]>(STORAGE_KEYS.USERS, []);
    for (const u of users) {
      if (u.email.toLowerCase() === clean) return { exists: true, reason: 'البريد الالكتروني مسجل مسبقاً' };
      if (u.username.toLowerCase() === clean) return { exists: true, reason: 'اسم المستخدم مسجل مسبقاً' };
      const uPhoneDigits = u.phone.replace(/\D/g, '');
      if (cleanDigits && uPhoneDigits && (uPhoneDigits.includes(cleanDigits) || cleanDigits.includes(uPhoneDigits))) {
        return { exists: true, reason: 'رقم الجوال مسجل مسبقاً' };
      }
    }

    // Check pending requests
    const requests = this.get<DelegateRequest[]>(STORAGE_KEYS.DELEGATE_REQUESTS, []);
    for (const r of requests) {
      if (r.status === 'معلق') {
        if (r.email.toLowerCase() === clean) return { exists: true, reason: 'البريد الالكتروني لديه طلب تسجيل معلق مسبقاً' };
        if (r.username.toLowerCase() === clean) return { exists: true, reason: 'اسم المستخدم لديه طلب تسجيل معلق مسبقاً' };
        const rPhoneDigits = r.phone.replace(/\D/g, '');
        if (cleanDigits && rPhoneDigits && (rPhoneDigits.includes(cleanDigits) || cleanDigits.includes(rPhoneDigits))) {
          return { exists: true, reason: 'رقم الجوال لديه طلب تسجيل معلق مسبقاً' };
        }
      }
    }

    return { exists: false };
  }

  // Section 2.1 & 2.2: Create Delegate Join Request
  async createDelegateRequest(data: {
    store_slug: string;
    name: string;
    phone: string;
    email: string;
    username: string;
    password: string;
  }): Promise<{ success: boolean; exists?: boolean; reason?: string; notFound?: boolean; request?: DelegateRequest; store_name?: string }> {
    // 1. Check duplicate account (Rule 3.6)
    const existsCheck = this.checkUserOrDelegateExists(data.username);
    if (existsCheck.exists) return { success: false, exists: true, reason: existsCheck.reason };

    const emailCheck = this.checkUserOrDelegateExists(data.email);
    if (emailCheck.exists) return { success: false, exists: true, reason: emailCheck.reason };

    const phoneCheck = this.checkUserOrDelegateExists(data.phone);
    if (phoneCheck.exists) return { success: false, exists: true, reason: phoneCheck.reason };

    // 2. Find target company
    const store = this.getSubscriberBySlug(data.store_slug);
    if (!store) {
      return { success: false, notFound: true };
    }

    const tenantId = store.id;
    const passwordHash = await hashPassword(data.password);

    const newRequest: DelegateRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: tenantId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      username: data.username.trim(),
      password_hash: passwordHash,
      store_slug: data.store_slug,
      status: 'معلق',
      created_at: new Date().toISOString(),
    };

    const requests = this.get<DelegateRequest[]>(STORAGE_KEYS.DELEGATE_REQUESTS, []);
    requests.push(newRequest);
    this.set(STORAGE_KEYS.DELEGATE_REQUESTS, requests);

    this.logActivity({
      tenant_id: tenantId,
      user_name: data.username.trim(),
      action_type: 'اضافة',
      details: `طلب انضمام مندوب جديد (${data.name}) لشركة ${store.store_name}`,
      subscription_id: 'subscription_id' in store ? store.subscription_id : 'NOOR-HQ',
      store_name: store.store_name,
    });

    return { 
      success: true, 
      request: newRequest, 
      store_name: store.store_name 
    };
  }

  // Section 2.2: Get delegate requests for tenant (WHERE tenant_id = current_tenant)
  getDelegateRequests(tenantId: string): DelegateRequest[] {
    const requests = this.get<DelegateRequest[]>(STORAGE_KEYS.DELEGATE_REQUESTS, []);
    return requests.filter(r => r.tenant_id === tenantId);
  }

  // Approve Delegate Request
  approveDelegateRequest(
    requestId: string,
    initialPermissions?: Partial<Record<SystemPageName, PermissionLevel>>
  ): User | null {
    const requests = this.get<DelegateRequest[]>(STORAGE_KEYS.DELEGATE_REQUESTS, []);
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return null;

    const req = requests[reqIndex];
    req.status = 'موافق';
    this.set(STORAGE_KEYS.DELEGATE_REQUESTS, requests);

    // Default permissions for delegate: 'مشاهدة' except 'ميزان الصلاحيات' which is 'مخفي'
    const defaultPerms: Partial<Record<SystemPageName, PermissionLevel>> = {};
    SYSTEM_PAGES.forEach(page => {
      if (page === 'ميزان الصلاحيات' || page === 'اعدادات' || page === 'اشتراكي') {
        defaultPerms[page] = 'مخفي';
      } else {
        defaultPerms[page] = 'مشاهدة';
      }
    });

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: req.tenant_id,
      username: req.username,
      email: req.email,
      phone: req.phone,
      display_name: req.name,
      role: 'مندوب',
      password_hash: req.password_hash,
      status: 'نشط',
      created_at: new Date().toISOString(),
      permissions: initialPermissions || defaultPerms,
    };

    const users = this.get<User[]>(STORAGE_KEYS.USERS, []);
    users.push(newUser);
    this.set(STORAGE_KEYS.USERS, users);

    // Increment delegates count for subscriber
    const sub = this.resolveSubscriber(req.tenant_id);
    const resolvedTenantId = sub ? sub.id : req.tenant_id;
    const realSubscriptionId = sub ? sub.subscription_id : 'NOOR-HQ';
    const realStoreName = sub ? sub.store_name : 'NOOR';

    if (sub) {
      const subscribers = this.getSubscribers();
      const sIdx = subscribers.findIndex(s => s.id === sub.id);
      if (sIdx !== -1) {
        subscribers[sIdx].delegates_count = (subscribers[sIdx].delegates_count || 0) + 1;
        this.set(STORAGE_KEYS.SUBSCRIBERS, subscribers);
      }
    }

    this.logActivity({
      tenant_id: resolvedTenantId,
      user_name: 'صاحب الشركة',
      action_type: 'اضافة',
      details: `الموافقة على انضمام المندوب ${req.name} وتحديد صلاحياته في ميزان الصلاحيات`,
      subscription_id: realSubscriptionId,
      store_name: realStoreName,
    });

    return newUser;
  }

  // Reject Delegate Request
  rejectDelegateRequest(requestId: string): boolean {
    const requests = this.get<DelegateRequest[]>(STORAGE_KEYS.DELEGATE_REQUESTS, []);
    const req = requests.find(r => r.id === requestId);
    if (!req) return false;

    req.status = 'مرفوض';
    this.set(STORAGE_KEYS.DELEGATE_REQUESTS, requests);

    const sub = this.resolveSubscriber(req.tenant_id);
    const resolvedTenantId = sub ? sub.id : req.tenant_id;
    const realSubscriptionId = sub ? sub.subscription_id : 'NOOR-HQ';
    const realStoreName = sub ? sub.store_name : 'NOOR';

    this.logActivity({
      tenant_id: resolvedTenantId,
      user_name: 'صاحب الشركة',
      action_type: 'تعديل',
      details: `رفض طلب انضمام المندوب ${req.name}`,
      subscription_id: realSubscriptionId,
      store_name: realStoreName,
    });

    return true;
  }

  // Section 2.3 & 2.4: Get Tenant Users for Permissions Matrix
  // Puts Owner (مالك) at the very top (سطر المالك التلقائي ذهبي مقفل حر)
  getTenantUsers(tenantId?: string): User[] {
    const context = this.getActiveTenantContext(tenantId);
    const resolvedTenantId = context.tenantId;

    const allUsers = this.get<User[]>(STORAGE_KEYS.USERS, []);
    let tenantUsers = allUsers.filter(u => u.tenant_id === resolvedTenantId);

    // If no users matched resolvedTenantId, but allUsers has non-super-owner users:
    // Link them to resolvedTenantId so any previously saved user appears immediately!
    if (tenantUsers.length === 0 && allUsers.length > 0) {
      const nonSuperOwners = allUsers.filter(u => u.role !== 'سوبر مالك');
      if (nonSuperOwners.length > 0) {
        nonSuperOwners.forEach(u => {
          u.tenant_id = resolvedTenantId;
        });
        this.set(STORAGE_KEYS.USERS, allUsers);
        tenantUsers = nonSuperOwners;
      }
    }

    const subscriber = context.subscriber;
    let ownerUser = tenantUsers.find(u => u.role === 'مالك');

    // If owner user does not exist in users array yet but a real subscriber exists, reconstruct from subscriber
    if (!ownerUser && subscriber) {
      ownerUser = {
        id: `usr_owner_${resolvedTenantId}`,
        tenant_id: resolvedTenantId,
        username: subscriber.username,
        email: subscriber.email,
        phone: subscriber.phone,
        display_name: subscriber.owner_name,
        role: 'مالك',
        password_hash: subscriber.password_hash,
        status: 'نشط',
        created_at: subscriber.created_at,
      };
      tenantUsers.unshift(ownerUser);
      if (!allUsers.some(u => u.id === ownerUser!.id)) {
        allUsers.unshift(ownerUser);
        this.set(STORAGE_KEYS.USERS, allUsers);
      }
    }

    // Ensure Owner always has all pages as 'حر'
    if (ownerUser) {
      const ownerPerms: Partial<Record<SystemPageName, PermissionLevel>> = {};
      SYSTEM_PAGES.forEach(page => {
        ownerPerms[page] = 'حر';
      });
      ownerUser.permissions = ownerPerms;
    }

    // Sort: Owner first, then others
    return tenantUsers.sort((a, b) => {
      if (a.role === 'مالك') return -1;
      if (b.role === 'مالك') return 1;
      return 0;
    });
  }

  // Update a single permission cell in the matrix (Section 2.3)
  updateUserPermission(
    tenantId: string,
    userId: string,
    pageName: SystemPageName,
    newPermission: PermissionLevel
  ): boolean {
    const sub = this.resolveSubscriber(tenantId);
    const resolvedTenantId = sub ? sub.id : tenantId;
    const realSubscriptionId = sub ? sub.subscription_id : 'NOOR-HQ';
    const realStoreName = sub ? sub.store_name : 'NOOR';

    const allUsers = this.get<User[]>(STORAGE_KEYS.USERS, []);
    const userIndex = allUsers.findIndex(
      u => u.id === userId && (u.tenant_id === resolvedTenantId || u.tenant_id === tenantId)
    );
    if (userIndex === -1) return false;

    // Rule 2.4: The Owner cannot be modified!
    if (allUsers[userIndex].role === 'مالك') {
      return false;
    }

    if (!allUsers[userIndex].permissions) {
      allUsers[userIndex].permissions = {};
    }

    allUsers[userIndex].permissions![pageName] = newPermission;
    this.set(STORAGE_KEYS.USERS, allUsers);

    this.logActivity({
      tenant_id: resolvedTenantId,
      user_name: 'صاحب الشركة',
      action_type: 'تعديل',
      details: `تعديل صلاحية صفحة (${pageName}) للمستخدم ${allUsers[userIndex].username} إلى (${newPermission})`,
      subscription_id: realSubscriptionId,
      store_name: realStoreName,
    });

    return true;
  }

  // Section 2.3 (Box 2): Add Manual User in Permissions Matrix
  async addManualUser(
    tenantId: string,
    data: {
      email: string;
      display_name: string;
      username: string;
      password: string;
      role: 'مندوب' | 'ادمن';
      phone: string;
    }
  ): Promise<{ success: boolean; user?: User; exists?: boolean; reason?: string }> {
    const existsCheck = this.checkUserOrDelegateExists(data.username);
    if (existsCheck.exists) return { success: false, exists: true, reason: existsCheck.reason };

    const emailCheck = this.checkUserOrDelegateExists(data.email);
    if (emailCheck.exists) return { success: false, exists: true, reason: emailCheck.reason };

    const passwordHash = await hashPassword(data.password);

    // Resolve company and real IDs using unified active tenant context
    const context = this.getActiveTenantContext(tenantId);
    const resolvedTenantId = context.tenantId;
    const realSubscriptionId = context.subscriptionId;
    const realStoreName = context.storeName;
    const sub = context.subscriber;

    // Initial permissions based on role
    const initialPerms: Partial<Record<SystemPageName, PermissionLevel>> = {};
    SYSTEM_PAGES.forEach(page => {
      if (data.role === 'ادمن') {
        initialPerms[page] = page === 'اشتراكي' ? 'مشاهدة' : 'يتحكم';
      } else {
        // Delegate
        initialPerms[page] = page === 'ميزان الصلاحيات' || page === 'اشتراكي' ? 'مخفي' : 'مشاهدة';
      }
    });

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: resolvedTenantId,
      username: data.username.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      display_name: data.display_name.trim(),
      role: data.role,
      password_hash: passwordHash,
      status: 'نشط',
      created_at: new Date().toISOString(),
      permissions: initialPerms,
    };

    const users = this.get<User[]>(STORAGE_KEYS.USERS, []);
    users.push(newUser);
    this.set(STORAGE_KEYS.USERS, users);

    // Increment delegates count if مندوب
    if (data.role === 'مندوب' && sub) {
      const subscribers = this.getSubscribers();
      const sIdx = subscribers.findIndex(s => s.id === sub.id);
      if (sIdx !== -1) {
        subscribers[sIdx].delegates_count = (subscribers[sIdx].delegates_count || 0) + 1;
        this.set(STORAGE_KEYS.SUBSCRIBERS, subscribers);
      }
    }

    this.logActivity({
      tenant_id: resolvedTenantId,
      user_name: 'صاحب الشركة',
      action_type: 'اضافة',
      details: `إضافة مستخدم يدوي (${data.display_name} - ${data.role}) في ميزان الصلاحيات`,
      subscription_id: realSubscriptionId,
      store_name: realStoreName,
    });

    return { success: true, user: newUser };
  }
}


export const db = new StorageService();

// Calculate remaining days until expiration
export function getRemainingDays(expiresAtISO: string): number {
  const expiry = new Date(expiresAtISO).getTime();
  const now = new Date().getTime();
  const diffMs = expiry - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Generate direct WhatsApp link (Rule 10: semi-automatic WhatsApp URL)
export function getWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
}
