/**
 * Customer Wallet Domain Model
 * Pure TypeScript business logic for prepaid wallet management
 */

export enum WalletStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}

export class CustomerWallet {
  constructor(
    public readonly id: string,
    public organizationId: string,
    public customerId: string,
    public balance: number = 0,
    public currency: string = 'USD',
    public status: WalletStatus = WalletStatus.ACTIVE,
    public lowBalanceThreshold: number = 10,
    public autoRecharge: boolean = false,
    public autoRechargeAmount?: number,
    public autoRechargeThreshold?: number,
    public lastRechargeDate?: Date,
    public lastDebitDate?: Date,
    public totalCredited: number = 0,
    public totalDebited: number = 0,
    public totalRefunded: number = 0,
    public lifetimeValue: number = 0,
    public metadata?: Record<string, any>,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  /**
   * Validates the wallet
   */
  validate(): void {
    const errors: string[] = [];

    if (!this.organizationId || this.organizationId.trim().length === 0) {
      errors.push('Organization ID is required');
    }

    if (!this.customerId || this.customerId.trim().length === 0) {
      errors.push('Customer ID is required');
    }

    if (this.lowBalanceThreshold < 0) {
      errors.push('Low balance threshold cannot be negative');
    }

    if (this.autoRecharge) {
      if (!this.autoRechargeAmount || this.autoRechargeAmount <= 0) {
        errors.push('Auto recharge amount must be greater than 0 when auto recharge is enabled');
      }
      if (this.autoRechargeThreshold === undefined || this.autoRechargeThreshold < 0) {
        errors.push('Auto recharge threshold must be non-negative when auto recharge is enabled');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Wallet validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Credits the wallet (adds funds)
   */
  credit(amount: number, description?: string): void {
    if (amount <= 0) {
      throw new Error('Credit amount must be greater than 0');
    }

    if (this.status !== WalletStatus.ACTIVE) {
      throw new Error('Cannot credit an inactive wallet');
    }

    this.balance += amount;
    this.totalCredited += amount;
    this.lifetimeValue += amount;
    this.lastRechargeDate = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Debits the wallet (deducts funds)
   */
  debit(amount: number, description?: string): void {
    if (amount <= 0) {
      throw new Error('Debit amount must be greater than 0');
    }

    if (this.status !== WalletStatus.ACTIVE) {
      throw new Error('Cannot debit an inactive wallet');
    }

    if (this.balance < amount) {
      throw new Error('Insufficient balance');
    }

    this.balance -= amount;
    this.totalDebited += amount;
    this.lastDebitDate = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Refunds the wallet (returns funds)
   */
  refund(amount: number, description?: string): void {
    if (amount <= 0) {
      throw new Error('Refund amount must be greater than 0');
    }

    this.balance += amount;
    this.totalRefunded += amount;
    this.updatedAt = new Date();
  }

  /**
   * Adjusts the wallet balance (admin operation)
   */
  adjust(amount: number, description?: string): void {
    if (amount === 0) {
      throw new Error('Adjustment amount cannot be zero');
    }

    this.balance += amount;
    this.updatedAt = new Date();
  }

  /**
   * Checks if wallet has sufficient balance
   */
  hasSufficientBalance(amount: number): boolean {
    return this.balance >= amount;
  }

  /**
   * Checks if wallet balance is low
   */
  isLowBalance(): boolean {
    return this.balance <= this.lowBalanceThreshold;
  }

  /**
   * Checks if auto recharge should be triggered
   */
  shouldAutoRecharge(): boolean {
    if (!this.autoRecharge || !this.autoRechargeThreshold) {
      return false;
    }
    return this.balance <= this.autoRechargeThreshold;
  }

  /**
   * Gets the auto recharge amount
   */
  getAutoRechargeAmount(): number {
    return this.autoRechargeAmount || 0;
  }

  /**
   * Suspends the wallet
   */
  suspend(): void {
    if (this.status === WalletStatus.SUSPENDED) {
      throw new Error('Wallet is already suspended');
    }
    this.status = WalletStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  /**
   * Activates the wallet
   */
  activate(): void {
    if (this.status === WalletStatus.ACTIVE) {
      throw new Error('Wallet is already active');
    }
    this.status = WalletStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  /**
   * Closes the wallet
   */
  close(): void {
    if (this.status === WalletStatus.CLOSED) {
      throw new Error('Wallet is already closed');
    }
    if (this.balance > 0) {
      throw new Error('Cannot close wallet with positive balance');
    }
    this.status = WalletStatus.CLOSED;
    this.updatedAt = new Date();
  }

  /**
   * Updates wallet settings
   */
  updateSettings(
    lowBalanceThreshold?: number,
    autoRecharge?: boolean,
    autoRechargeAmount?: number,
    autoRechargeThreshold?: number,
  ): void {
    if (lowBalanceThreshold !== undefined) this.lowBalanceThreshold = lowBalanceThreshold;
    if (autoRecharge !== undefined) this.autoRecharge = autoRecharge;
    if (autoRechargeAmount !== undefined) this.autoRechargeAmount = autoRechargeAmount;
    if (autoRechargeThreshold !== undefined) this.autoRechargeThreshold = autoRechargeThreshold;
    this.updatedAt = new Date();
  }

  /**
   * Gets wallet statistics
   */
  getStatistics(): {
    balance: number;
    totalCredited: number;
    totalDebited: number;
    totalRefunded: number;
    lifetimeValue: number;
    netSpend: number;
  } {
    return {
      balance: this.balance,
      totalCredited: this.totalCredited,
      totalDebited: this.totalDebited,
      totalRefunded: this.totalRefunded,
      lifetimeValue: this.lifetimeValue,
      netSpend: this.totalDebited - this.totalRefunded,
    };
  }

  /**
   * Converts domain to plain JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      organizationId: this.organizationId,
      customerId: this.customerId,
      balance: this.balance,
      currency: this.currency,
      status: this.status,
      lowBalanceThreshold: this.lowBalanceThreshold,
      autoRecharge: this.autoRecharge,
      autoRechargeAmount: this.autoRechargeAmount,
      autoRechargeThreshold: this.autoRechargeThreshold,
      lastRechargeDate: this.lastRechargeDate,
      lastDebitDate: this.lastDebitDate,
      totalCredited: this.totalCredited,
      totalDebited: this.totalDebited,
      totalRefunded: this.totalRefunded,
      lifetimeValue: this.lifetimeValue,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
