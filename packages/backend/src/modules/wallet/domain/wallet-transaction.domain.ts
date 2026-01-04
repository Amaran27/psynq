/**
 * Wallet Transaction Domain Model
 * 
 * Pure TypeScript domain logic for wallet transactions
 * Provides complete audit trail for all wallet operations
 */

export enum TransactionType {
  CREDIT = 'credit',           // Add funds to wallet
  DEBIT = 'debit',             // Deduct funds (usage charge)
  REFUND = 'refund',           // Return funds
  ADJUSTMENT = 'adjustment',   // Manual correction
  AUTO_RECHARGE = 'auto_recharge', // Automatic top-up
}

export enum TransactionStatus {
  PENDING = 'pending',     // Transaction initiated
  COMPLETED = 'completed', // Successfully processed
  FAILED = 'failed',       // Failed to process
  REVERSED = 'reversed',   // Reversed/voided
}

export class WalletTransaction {
  constructor(
    public readonly id: string,
    public readonly walletId: string,
    public readonly organizationId: string,
    public readonly type: TransactionType,
    public readonly amount: number,
    public readonly balanceBefore: number,
    public readonly balanceAfter: number,
    public status: TransactionStatus,
    public readonly currency: string,
    public readonly reference?: string, // External reference (invoice, call CDR, etc.)
    public readonly referenceType?: string, // Type of reference (invoice, call, campaign, etc.)
    public readonly reason?: string,
    public readonly initiatedBy?: string, // User/system who initiated
    public readonly metadata?: Record<string, any>,
    public readonly createdAt?: Date,
    public updatedAt?: Date,
  ) {
    this.validateTransaction();
  }

  private validateTransaction(): void {
    if (this.amount === 0) {
      throw new Error('Transaction amount cannot be zero');
    }

    // Validate amount sign based on transaction type
    switch (this.type) {
      case TransactionType.CREDIT:
      case TransactionType.REFUND:
      case TransactionType.AUTO_RECHARGE:
        if (this.amount < 0) {
          throw new Error(`${this.type} amount must be positive`);
        }
        break;
      case TransactionType.DEBIT:
        if (this.amount < 0) {
          throw new Error('Debit amount must be positive');
        }
        break;
      case TransactionType.ADJUSTMENT:
        // Adjustments can be positive or negative
        break;
    }

    // Validate balance calculation
    const expectedBalance = this.calculateExpectedBalance();
    if (Math.abs(this.balanceAfter - expectedBalance) > 0.001) {
      throw new Error(
        `Balance calculation mismatch: expected ${expectedBalance}, got ${this.balanceAfter}`
      );
    }
  }

  private calculateExpectedBalance(): number {
    switch (this.type) {
      case TransactionType.CREDIT:
      case TransactionType.REFUND:
      case TransactionType.AUTO_RECHARGE:
        return this.balanceBefore + this.amount;
      case TransactionType.DEBIT:
        return this.balanceBefore - this.amount;
      case TransactionType.ADJUSTMENT:
        return this.balanceBefore + this.amount;
      default:
        throw new Error(`Unknown transaction type: ${this.type}`);
    }
  }

  /**
   * Check if transaction can be reversed
   */
  canBeReversed(): boolean {
    return (
      this.status === TransactionStatus.COMPLETED &&
      this.type !== TransactionType.ADJUSTMENT // Adjustments cannot be reversed
    );
  }

  /**
   * Mark transaction as completed
   */
  markAsCompleted(): void {
    if (this.status === TransactionStatus.COMPLETED) {
      throw new Error('Transaction is already completed');
    }

    if (this.status === TransactionStatus.REVERSED) {
      throw new Error('Cannot complete a reversed transaction');
    }

    this.status = TransactionStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  /**
   * Mark transaction as failed
   */
  markAsFailed(reason: string): void {
    if (this.status === TransactionStatus.COMPLETED) {
      throw new Error('Cannot fail a completed transaction');
    }

    if (this.status === TransactionStatus.REVERSED) {
      throw new Error('Cannot fail a reversed transaction');
    }

    this.status = TransactionStatus.FAILED;
    this.updatedAt = new Date();

    if (this.metadata) {
      this.metadata.failureReason = reason;
      this.metadata.failedAt = new Date().toISOString();
    }
  }

  /**
   * Reverse transaction (create opposite transaction)
   */
  markAsReversed(reversalTransactionId: string): void {
    if (!this.canBeReversed()) {
      throw new Error('Transaction cannot be reversed');
    }

    this.status = TransactionStatus.REVERSED;
    this.updatedAt = new Date();

    if (this.metadata) {
      this.metadata.reversalTransactionId = reversalTransactionId;
      this.metadata.reversedAt = new Date().toISOString();
    }
  }

  /**
   * Get transaction impact on balance (positive = increase, negative = decrease)
   */
  getBalanceImpact(): number {
    switch (this.type) {
      case TransactionType.CREDIT:
      case TransactionType.REFUND:
      case TransactionType.AUTO_RECHARGE:
        return this.amount;
      case TransactionType.DEBIT:
        return -this.amount;
      case TransactionType.ADJUSTMENT:
        return this.amount;
      default:
        return 0;
    }
  }

  /**
   * Check if this is a credit transaction (increases balance)
   */
  isCredit(): boolean {
    return [
      TransactionType.CREDIT,
      TransactionType.REFUND,
      TransactionType.AUTO_RECHARGE,
    ].includes(this.type) || (this.type === TransactionType.ADJUSTMENT && this.amount > 0);
  }

  /**
   * Check if this is a debit transaction (decreases balance)
   */
  isDebit(): boolean {
    return (
      this.type === TransactionType.DEBIT ||
      (this.type === TransactionType.ADJUSTMENT && this.amount < 0)
    );
  }

  /**
   * Get transaction description
   */
  getDescription(): string {
    const parts: string[] = [this.type];

    if (this.reason) {
      parts.push(`- ${this.reason}`);
    }

    if (this.reference) {
      parts.push(`(ref: ${this.reference})`);
    }

    return parts.join(' ');
  }

  /**
   * Update metadata
   */
  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
    this.updatedAt = new Date();
  }

  /**
   * Create a reversal transaction (opposite of current transaction)
   */
  createReversal(): Partial<WalletTransaction> {
    if (!this.canBeReversed()) {
      throw new Error('Transaction cannot be reversed');
    }

    let reversalType: TransactionType;
    switch (this.type) {
      case TransactionType.CREDIT:
        reversalType = TransactionType.DEBIT;
        break;
      case TransactionType.DEBIT:
        reversalType = TransactionType.CREDIT;
        break;
      case TransactionType.REFUND:
        reversalType = TransactionType.DEBIT;
        break;
      case TransactionType.AUTO_RECHARGE:
        reversalType = TransactionType.DEBIT;
        break;
      default:
        throw new Error(`Cannot reverse transaction type: ${this.type}`);
    }

    return {
      walletId: this.walletId,
      organizationId: this.organizationId,
      type: reversalType,
      amount: this.amount,
      status: TransactionStatus.PENDING,
      currency: this.currency,
      reference: this.id, // Reference to original transaction
      referenceType: 'reversal',
      reason: `Reversal of transaction ${this.id}`,
      metadata: {
        originalTransactionId: this.id,
        originalType: this.type,
        originalAmount: this.amount,
      },
    };
  }
}
