import { SettingsApiPort, Organization, Setting } from '@/ports/settings-api.port';

export class HttpSettingsApiAdapter implements SettingsApiPort {
  private baseUrl: string;

  constructor(baseUrl = null) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      this.baseUrl = `${protocol}//${hostname}:3001`;
    } else {
      this.baseUrl = 'http://127.0.0.1:3001';
    }
  }

  private getAuthHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async createTenant(name: string, slug: string, token: string): Promise<Organization> {
    const response = await fetch(`${this.baseUrl}/tenants`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ name, slug }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create tenant');
    }
    return response.json();
  }

  async listTenants(token: string): Promise<Organization[]> {
    const response = await fetch(`${this.baseUrl}/tenants`, {
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to list tenants');
    }
    return response.json();
  }

  async getTenant(id: string, token: string): Promise<Organization> {
    const response = await fetch(`${this.baseUrl}/tenants/${id}`, {
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get tenant');
    }
    return response.json();
  }

  async getSetting(key: string, token: string): Promise<Setting> {
    const response = await fetch(`${this.baseUrl}/settings/${key}`, {
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get setting');
    }
    return response.json();
  }

  async setSetting(key: string, value: any, isSecret: boolean, token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/settings/${key}`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ value, isSecret }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update setting');
    }
  }

  async getSystemSetting(key: string, token: string): Promise<Setting> {
    const response = await fetch(`${this.baseUrl}/settings/system/${key}`, {
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get system setting');
    }
    return response.json();
  }
}
