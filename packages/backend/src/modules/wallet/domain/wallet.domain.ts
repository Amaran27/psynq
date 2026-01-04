/**
 * Wallet Domain Model
 * 
 * Pure TypeScript domain logic for wallet management
 * Supports prepaid/postpaid billing models
 */

export enum WalletType {
  PREPAID = 'prepaid',   // Pay-before-use (requires positive balance)
  POSTPAID = 'postpaid', // Pay-after-use (allows negative balance up to credit limit)
}

export enum WalletStatus {
  ACTIVE = 'active',       // Wallet can be used
  SUSPENDED = 'suspended', // Wallet temporarily disabled (manual)
  BLOCKED = 'blocked',     // Wallet blocked (insufficient balance/credit)
  CLOSED = 'closed',       // Wallet permanently closed
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  INR = 'INR',
}

export class Wallet {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly customerId: string, // Organization's customer ID
    public type: WalletType,
    public currency: Currency,
    public balance: number,
    public creditLimit: number, // For postpaid wallets
    public lowBalanceThreshold: number, // Alert threshold
    public status: WalletStatus,
    public autoRecharge: boolean,
    public autoRechargeAmount?: number,
    public autoRechargeTrigger?: number,
    public metadata?: Record<string, any>,
    public readonly createdAt?: Date,
    public updatedAt?: Date,
  ) {
    this.validateWallet();
  }

  private validateWallet(): void {
    if (this.type === WalletType.PREPAID && this.creditLimit > 0) {
      throw new Error('Prepaid wallets cannot have credit limit');
    }

    if (this.type === WalletType.POSTPAID && this.creditLimit < 0) {
      throw new Error('Postpaid credit limit must be non-negative');
    }

    if (this.lowBalanceThreshold < 0) {
      throw new Error('Low balance threshold must be non-negative');
    }

    if (this.autoRecharge) {
      if (!this.autoRechargeAmount || this.autoRechargeAmount <= 0) {
        throw new Error('Auto-recharge amount must be positive when enabled');
      }
      if (this.autoRechargeTrigger === undefined || this.autoRechargeTrigger < 0) {
        throw new Error('Auto-recharge trigger must be non-negative when enabled');
      }
    }
  }

  /**
   * Check if wallet can be used for transactions
   */
  isActive(): boolean {
    return this.status === WalletStatus.ACTIVE;
  }

  /**
   * Check if wallet has sufficient balance for a charge
   */
  hasSufficientBalance(amount: number): boolean {
    if (amount < 0) {
      throw new Error('Amount must be non-negative');
    }

    if (this.type === WalletType.PREPAID) {
      return this.balance >= amount;
    }

    // Postpaid: can go negative up to credit limit
    return (this.balance - amount) >= -this.creditLimit;
  }

  /**
   * Get available balance (including credit for postpaid)
   */
  getAvailableBalance(): number {
    if (this.type === WalletType.PREPAID) {
      return Math.max(0, this.balance);
    }

    // Postpaid: balance + credit limit
    return this.balance + this.creditLimit;
  }

  /**
   * Check if balance is below low threshold
   */
  isLowBalance(): boolean {
    return this.balance < this.lowBalanceThreshold;
  }

  /**
   * Check if auto-recharge should be triggered
   */
  shouldAutoRecharge(): boolean {
    if (!this.autoRecharge || !this.isActive()) {
      return false;
    }

    return this.balance <= (this.autoRechargeTrigger || 0);
  }

  /**
   * Credit wallet (add funds)
   */
  credit(amount: number, reason: string): void {
    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }

    if (!this.isActive()) {
      throw new Error(`Cannot credit wallet in ${this.status} status`);
    }

    this.balance += amount;
    this.updatedAt = new Date();

    // Unblock if previously blocked
    if (this.status === WalletStatus.BLOCKED) {
      this.status = WalletStatus.ACTIVE;
    }
  }

  /**
   * Debit wallet (charge/deduct funds)
   */
  debit(amount: number, reason: string): void {
    if (amount <= 0) {
      throw new Error('Debit amount must be positive');
    }

    if (!this.isActive()) {
      throw new Error(`Cannot debit wallet in ${this.status} status`);
    }

    if (!this.hasSufficientBalance(amount)) {
      throw new Error('Insufficient balance');
    }

    this.balance -= amount;
    this.updatedAt = new Date();

    // Check if wallet should be blocked
    if (this.type === WalletType.PREPAID && this.balance <= 0) {
      this.status = WalletStatus.BLOCKED;
    }
  }

  /**
   * Refund to wallet
   */
  refund(amount: number, reason: string): void {
    if (amount <= 0) {
      throw new Error('Refund amount must be positive');
    }

    this.balance += amount;
    this.updatedAt = new Date();

    // Unblock if previously blocked
    if (this.status === WalletStatus.BLOCKED && this.balance > 0) {
      this.status = WalletStatus.ACTIVE;
    }
  }

  /**
   * Manual adjustment (can be positive or negative)
   */
  adjust(amount: number, reason: string): void {
    if (amount === 0) {
      throw new Error('Adjustment amount cannot be zero');
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Adjustment reason is required');
    }

    const newBalance = this.balance + amount;

    // For prepaid, ensure balance doesn't violate limits
    if (this.type === WalletType.PREPAID && newBalance < 0) {
      throw new Error('Prepaid wallet balance cannot be negative');
    }

    // For postpaid, ensure within credit limit
    if (this.type === WalletType.POSTPAID && newBalance < -this.creditLimit) {
      throw new Error('Adjustment exceeds credit limit');
    }

    this.balance = newBalance;
    this.updatedAt = new Date();

    // Update status based on new balance
    if (this.status === WalletStatus.BLOCKED && this.balance > 0) {
      this.status = WalletStatus.ACTIVE;
    } else if (this.type === WalletType.PREPAID && this.balance <= 0) {
      this.status = WalletStatus.BLOCKED;
    }
  }

  /**
   * Suspend wallet (manual action)
   */
  suspend(reason: string): void {
    if (this.status === WalletStatus.CLOSED) {
      throw new Error('Cannot suspend a closed wallet');
    }

    if (this.status === WalletStatus.SUSPENDED) {
      throw new Error('Wallet is already suspended');
    }

    this.status = WalletStatus.SUSPENDED;
    this.updatedAt = new Date();

    if (this.metadata) {
      this.metadata.suspensionReason = reason;
      this.metadata.suspendedAt = new Date().toISOString();
    }
  }

  /**
   * Activate/Reactivate wallet
   */
  activate(): void {
    if (this.status === WalletStatus.CLOSED) {
      throw new Error('Cannot activate a closed wallet');
    }

    if (this.status === WalletStatus.ACTIVE) {
      throw new Error('Wallet is already active');
    }

    // Check if can be activated (prepaid needs balance)
    if (this.type === WalletType.PREPAID && this.balance <= 0) {
      throw new Error('Prepaid wallet requires positive balance to activate');
    }

    this.status = WalletStatus.ACTIVE;
    this.updatedAt = new Date();

    if (this.metadata) {
      delete this.metadata.suspensionReason;
      delete this.metadata.suspendedAt;
      this.metadata.activatedAt = new Date().toISOString();
    }
  }

  /**
   * Close wallet permanently
   */
  close(reason: string): void {
    if (this.status === WalletStatus.CLOSED) {
      throw new Error('Wallet is already closed');
    }

    if (this.balance < 0) {
      throw new Error('Cannot close wallet with negative balance');
    }

    this.status = WalletStatus.CLOSED;
    this.updatedAt = new Date();

    if (this.metadata) {
      this.metadata.closureReason = reason;
      this.metadata.closedAt = new Date().toISOString();
    }
  }

  /**
   * Update wallet configuration
   */
  updateConfig(updates: {
    type?: WalletType;
    creditLimit?: number;
    lowBalanceThreshold?: number;
    autoRecharge?: boolean;
    autoRechargeAmount?: number;
    autoRechargeTrigger?: number;
  }): void {
    if (updates.type !== undefined) {
      this.type = updates.type;
    }
    if (updates.creditLimit !== undefined) {
      this.creditLimit = updates.creditLimit;
    }
    if (updates.lowBalanceThreshold !== undefined) {
      this.lowBalanceThreshold = updates.lowBalanceThreshold;
    }
    if (updates.autoRecharge !== undefined) {
      this.autoRecharge = updates.autoRecharge;
    }
    if (updates.autoRechargeAmount !== undefined) {
      this.autoRechargeAmount = updates.autoRechargeAmount;
    }
    if (updates.autoRechargeTrigger !== undefined) {
      this.autoRechargeTrigger = updates.autoRechargeTrigger;
    }

    this.validateWallet();
    this.updatedAt = new Date();
  }

  /**
   * Update metadata
   */
  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
    this.updatedAt = new Date();
  }
}
