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

export interface StorageConfig {
  current: string;
  available: string[];
  configs: {
    minio?: any;
    s3?: any;
    local?: any;
  };
}

export interface TelephonyConfig {
  asterisk?: any;
  twilio?: any;
  trunk?: string;
}

export interface RecordingConfig {
  enabled: boolean;
  autoDeleteDays: number;
  format: string;
  path: string;
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
  getAllSystemSettings(token: string): Promise<Record<string, Setting>>;

  // Storage Configuration
  getStorageConfig(token: string): Promise<StorageConfig>;
  updateStorageConfig(provider: string, config: any, token: string): Promise<void>;
  testStorage(token: string): Promise<{ healthy: boolean; provider: string; message: string }>;

  // Telephony Configuration
  getTelephonyConfig(token: string): Promise<TelephonyConfig>;
  updateTelephonyConfig(trunk: string, config: any, token: string): Promise<void>;

  // Recording Configuration
  getRecordingConfig(token: string): Promise<RecordingConfig>;
  updateRecordingConfig(config: {
    enabled?: boolean;
    autoDeleteDays?: number;
    format?: string;
    path?: string;
  }, token: string): Promise<void>;
}
