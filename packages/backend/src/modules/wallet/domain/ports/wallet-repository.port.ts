/**
 * Wallet Repository Port
 * 
 * Interface for wallet persistence operations
 * Follows hexagonal architecture pattern
 */

import { Wallet } from '../wallet.domain';

export interface WalletRepository {
  /**
   * Create a new wallet
   */
  create(wallet: Wallet): Promise<Wallet>;

  /**
   * Find wallet by ID
   */
  findById(id: string): Promise<Wallet | null>;

  /**
   * Find wallet by organization and customer
   */
  findByCustomer(organizationId: string, customerId: string): Promise<Wallet | null>;

  /**
   * Find all wallets for an organization
   */
  findByOrganization(organizationId: string, filters?: {
    type?: string;
    status?: string;
    currency?: string;
  }): Promise<Wallet[]>;

  /**
   * Find wallets with low balance
   */
  findLowBalance(organizationId: string): Promise<Wallet[]>;

  /**
   * Find wallets that need auto-recharge
   */
  findNeedingAutoRecharge(organizationId: string): Promise<Wallet[]>;

  /**
   * Update wallet
   */
  update(wallet: Wallet): Promise<Wallet>;

  /**
   * Delete wallet
   */
  delete(id: string): Promise<void>;

  /**
   * Get wallet statistics for organization
   */
  getStatistics(organizationId: string): Promise<{
    totalWallets: number;
    activeWallets: number;
    totalBalance: number;
    lowBalanceCount: number;
    blockedCount: number;
  }>;
}

export const WALLET_REPOSITORY_PORT = Symbol('WALLET_REPOSITORY_PORT');
