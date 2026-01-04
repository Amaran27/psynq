import { CustomerWallet, WalletStatus } from '../customer-wallet.domain';

export const CUSTOMER_WALLET_REPOSITORY_PORT = 'CUSTOMER_WALLET_REPOSITORY_PORT';

export interface FindWalletsFilter {
  organizationId?: string;
  customerId?: string;
  status?: WalletStatus;
  lowBalance?: boolean;
}

export interface CustomerWalletRepository {
  create(wallet: CustomerWallet): Promise<CustomerWallet>;
  findById(id: string): Promise<CustomerWallet | null>;
  findAll(filter?: FindWalletsFilter): Promise<CustomerWallet[]>;
  findByCustomer(organizationId: string, customerId: string): Promise<CustomerWallet | null>;
  findLowBalance(organizationId: string): Promise<CustomerWallet[]>;
  findAutoRechargeEligible(organizationId: string): Promise<CustomerWallet[]>;
  update(wallet: CustomerWallet): Promise<CustomerWallet>;
  delete(id: string): Promise<void>;
  count(filter?: FindWalletsFilter): Promise<number>;
}
