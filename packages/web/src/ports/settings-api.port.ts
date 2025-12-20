export interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: any;
  isSecret: boolean;
}

export interface SettingsApiPort {
  // Tenant Management (System Admin only)
  createTenant(name: string, slug: string, token: string): Promise<Organization>;
  listTenants(token: string): Promise<Organization[]>;
  getTenant(id: string, token: string): Promise<Organization>;

  // Organization Settings (Admin/System Admin)
  getSetting(key: string, token: string): Promise<Setting>;
  setSetting(key: string, value: any, isSecret: boolean, token: string): Promise<void>;
  
  // System Settings (System Admin only)
  getSystemSetting(key: string, token: string): Promise<Setting>;
}
