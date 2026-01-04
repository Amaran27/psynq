/**
 * Salesforce API Port - Interface for Salesforce operations
 */

export interface SalesforceOAuthResult {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string; // User identity URL
  token_type: string;
  issued_at: string;
  signature: string;
}

export interface SalesforceUserInfo {
  id: string;
  organizationId: string;
  email: string;
  username: string;
  displayName: string;
}

export interface SalesforceOrgInfo {
  id: string;
  name: string;
  edition: string;
  instanceUrl: string;
}

export interface SalesforceApiLimits {
  dailyApiRequests: { max: number; remaining: number };
  dailyBulkApiRequests?: { max: number; remaining: number };
  dailyStreamingApiEvents?: { max: number; remaining: number };
  dataStorageMB?: { max: number; remaining: number };
  fileStorageMB?: { max: number; remaining: number };
}

export interface SalesforceContact {
  Id: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  AccountId?: string;
  OwnerId?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  [key: string]: any;
}

export interface SalesforceLead {
  Id: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  Company: string;
  Status: string;
  OwnerId?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  [key: string]: any;
}

export interface SalesforceTask {
  Id?: string;
  WhoId?: string; // Contact or Lead ID
  WhatId?: string; // Account, Opportunity, etc.
  Subject: string;
  Status: string;
  Priority?: string;
  ActivityDate?: string;
  Description?: string;
  CallDurationInSeconds?: number;
  CallType?: string;
  CallDisposition?: string;
  OwnerId?: string;
  [key: string]: any;
}

export interface SalesforceQueryResult<T = any> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

export interface SalesforceObjectMetadata {
  name: string;
  label: string;
  fields: {
    name: string;
    label: string;
    type: string;
    length?: number;
    required: boolean;
    unique: boolean;
  }[];
}

/**
 * Salesforce API Port Interface
 */
export interface SALESFORCE_API_PORT {
  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(clientId: string, redirectUri: string, state?: string): string;

  /**
   * Exchange authorization code for access token
   */
  getAccessToken(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<SalesforceOAuthResult>;

  /**
   * Refresh access token
   */
  refreshAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<SalesforceOAuthResult>;

  /**
   * Get current user info
   */
  getUserInfo(accessToken: string, instanceUrl: string): Promise<SalesforceUserInfo>;

  /**
   * Get organization info
   */
  getOrgInfo(accessToken: string, instanceUrl: string): Promise<SalesforceOrgInfo>;

  /**
   * Get API limits
   */
  getApiLimits(accessToken: string, instanceUrl: string): Promise<SalesforceApiLimits>;

  /**
   * Execute SOQL query
   */
  query<T = any>(
    accessToken: string,
    instanceUrl: string,
    soql: string,
  ): Promise<SalesforceQueryResult<T>>;

  /**
   * Query contacts
   */
  queryContacts(
    accessToken: string,
    instanceUrl: string,
    filter?: Record<string, any>,
    limit?: number,
  ): Promise<SalesforceContact[]>;

  /**
   * Query leads
   */
  queryLeads(
    accessToken: string,
    instanceUrl: string,
    filter?: Record<string, any>,
    limit?: number,
  ): Promise<SalesforceLead[]>;

  /**
   * Create task (call log)
   */
  createTask(
    accessToken: string,
    instanceUrl: string,
    task: SalesforceTask,
  ): Promise<string>;

  /**
   * Update record
   */
  updateRecord(
    accessToken: string,
    instanceUrl: string,
    objectType: string,
    recordId: string,
    data: Record<string, any>,
  ): Promise<void>;

  /**
   * Create record
   */
  createRecord(
    accessToken: string,
    instanceUrl: string,
    objectType: string,
    data: Record<string, any>,
  ): Promise<string>;

  /**
   * Get object metadata
   */
  getObjectMetadata(
    accessToken: string,
    instanceUrl: string,
    objectName: string,
  ): Promise<SalesforceObjectMetadata>;

  /**
   * Test connection
   */
  testConnection(accessToken: string, instanceUrl: string): Promise<boolean>;
}

export const SALESFORCE_API_PORT = Symbol('SALESFORCE_API_PORT');
