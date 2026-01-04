/**
 * Wallet Transaction Repository Port
 * 
 * Interface for wallet transaction persistence operations
 * Follows hexagonal architecture pattern
 */

import { WalletTransaction } from '../wallet-transaction.domain';

export interface WalletTransactionRepository {
  /**
   * Create a new transaction
   */
  create(transaction: WalletTransaction): Promise<WalletTransaction>;

  /**
   * Find transaction by ID
   */
  findById(id: string): Promise<WalletTransaction | null>;

  /**
   * Find all transactions for a wallet
   */
  findByWallet(
    walletId: string,
    filters?: {
      type?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<WalletTransaction[]>;

  /**
   * Find transactions by organization
   */
  findByOrganization(
    organizationId: string,
    filters?: {
      type?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<WalletTransaction[]>;

  /**
   * Find transaction by reference
   */
  findByReference(reference: string, referenceType?: string): Promise<WalletTransaction[]>;

  /**
   * Update transaction
   */
  update(transaction: WalletTransaction): Promise<WalletTransaction>;

  /**
   * Get transaction statistics for wallet
   */
  getWalletStatistics(walletId: string, startDate?: Date, endDate?: Date): Promise<{
    totalCredits: number;
    totalDebits: number;
    totalRefunds: number;
    totalAdjustments: number;
    transactionCount: number;
  }>;

  /**
   * Get transaction statistics for organization
   */
  getOrganizationStatistics(organizationId: string, startDate?: Date, endDate?: Date): Promise<{
    totalCredits: number;
    totalDebits: number;
    totalRefunds: number;
    totalAdjustments: number;
    transactionCount: number;
  }>;
}

export const WALLET_TRANSACTION_REPOSITORY_PORT = Symbol('WALLET_TRANSACTION_REPOSITORY_PORT');
