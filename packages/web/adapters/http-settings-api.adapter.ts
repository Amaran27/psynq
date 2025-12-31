import { SettingsApiPort, Organization, Setting } from '../ports/settings-api.port';
import { getApiClient } from '../services/api-client.service';

export class HttpSettingsApiAdapter implements SettingsApiPort {
  private apiClient = getApiClient();

  async createTenant(name: string, slug: string, token: string): Promise<Organization> {
    const response = await this.apiClient.post<Organization>('/tenants', { name, slug });

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  async listTenants(token: string): Promise<Organization[]> {
    const response = await this.apiClient.get<Organization[]>('/tenants');

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  async getTenant(id: string, token: string): Promise<Organization> {
    const response = await this.apiClient.get<Organization>(`/tenants/${id}`);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  async getSetting(key: string, token: string): Promise<Setting> {
    const response = await this.apiClient.get<{ success: boolean; data: Setting }>(`/api/system-settings/${key}`);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!.data;
  }

  async setSetting(key: string, value: any, isSecret: boolean, token: string): Promise<void> {
    const response = await this.apiClient.put(`/api/system-settings/${key}`, { value });

    if (response.error) {
      throw new Error(response.error);
    }
  }

  async getSystemSetting(key: string, token: string): Promise<Setting> {
    const response = await this.apiClient.get<{ success: boolean; data: Setting }>(`/api/system-settings/${key}`);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!.data;
  }

  /**
   * Get all system settings (admin only)
   */
  async getAllSystemSettings(token: string): Promise<Record<string, Setting>> {
    const response = await this.apiClient.get<{ success: boolean; data: Record<string, Setting> }>('/api/system-settings');

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!.data;
  }

  /**
   * Get storage configuration
   */
  async getStorageConfig(token: string): Promise<any> {
    const response = await this.apiClient.get<{ success: boolean; data: any }>('/api/system-settings/storage/config');

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!.data;
  }

  /**
   * Update storage configuration
   */
  async updateStorageConfig(provider: string, config: any, token: string): Promise<void> {
    const response = await this.apiClient.put('/api/system-settings/storage/config', { provider, config });

    if (response.error) {
      throw new Error(response.error);
    }
  }

  /**
   * Test storage connection
   */
  async testStorage(token: string): Promise<{ healthy: boolean; provider: string; message: string }> {
    const response = await this.apiClient.post<{ success: boolean; data: any }>('/api/system-settings/storage/test', {});

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!.data;
  }

  /**
   * Get telephony configuration
   */
  async getTelephonyConfig(token: string): Promise<any> {
    const response = await this.apiClient.get<{ success: boolean; data: any }>('/api/system-settings/telephony/config');

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!.data;
  }

  /**
   * Update telephony configuration
   */
  async updateTelephonyConfig(trunk: string, config: any, token: string): Promise<void> {
    const response = await this.apiClient.put('/api/system-settings/telephony/config', { trunk, config });

    if (response.error) {
      throw new Error(response.error);
    }
  }

  /**
   * Get recording configuration
   */
  async getRecordingConfig(token: string): Promise<any> {
    const response = await this.apiClient.get<{ success: boolean; data: any }>('/api/system-settings/recording/config');

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!.data;
  }

  /**
   * Update recording configuration
   */
  async updateRecordingConfig(config: {
    enabled?: boolean;
    autoDeleteDays?: number;
    format?: string;
    path?: string;
  }, token: string): Promise<void> {
    const response = await this.apiClient.put('/api/system-settings/recording/config', config);

    if (response.error) {
      throw new Error(response.error);
    }
  }
}
