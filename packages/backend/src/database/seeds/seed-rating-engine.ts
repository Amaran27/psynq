import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export async function seedRatingEngine(dataSource: DataSource): Promise<void> {
  const ratePlanRepository = dataSource.getRepository('rate_plans');
  const walletRepository = dataSource.getRepository('customer_wallets');

  // Get default organization (assuming it exists from earlier seeds)
  const organizationRepository = dataSource.getRepository('organizations');
  const defaultOrg = await organizationRepository.findOne({
    where: { name: 'Psitrix' },
  });

  if (!defaultOrg) {
    console.log('Default organization not found. Skipping rating engine seed.');
    return;
  }

  const orgId = defaultOrg.id;

  console.log('Seeding rating engine data...');

  // Seed Rate Plans
  const ratePlans = [
    {
      id: uuidv4(),
      organization_id: orgId,
      name: 'Standard Prepaid - Per Minute',
      type: 'prepaid',
      status: 'active',
      description: 'Standard prepaid plan with per-minute billing',
      charge_type: 'per_minute',
      base_rate: 0.05,
      minimum_charge: 0.01,
      rounding_method: 'ceil',
      rounding_increment: 1,
      free_seconds: 0,
      currency: 'USD',
      billing_cycle: 30,
      grace_period_days: 7,
      low_balance_threshold: 10.0,
      auto_recharge: false,
      auto_recharge_amount: null,
      auto_recharge_threshold: null,
      effective_from: null,
      effective_to: null,
      metadata: {
        category: 'voice',
        tier: 'standard',
      },
    },
    {
      id: uuidv4(),
      organization_id: orgId,
      name: 'Premium Prepaid - Per Second',
      type: 'prepaid',
      status: 'active',
      description: 'Premium prepaid plan with per-second billing',
      charge_type: 'per_second',
      base_rate: 0.001,
      minimum_charge: 0.005,
      rounding_method: 'round',
      rounding_increment: 1,
      free_seconds: 60,
      currency: 'USD',
      billing_cycle: 30,
      grace_period_days: 14,
      low_balance_threshold: 20.0,
      auto_recharge: true,
      auto_recharge_amount: 50.0,
      auto_recharge_threshold: 5.0,
      effective_from: null,
      effective_to: null,
      metadata: {
        category: 'voice',
        tier: 'premium',
        features: ['free_minute', 'auto_recharge'],
      },
    },
    {
      id: uuidv4(),
      organization_id: orgId,
      name: 'Postpaid Enterprise',
      type: 'postpaid',
      status: 'active',
      description: 'Enterprise postpaid plan with monthly billing',
      charge_type: 'per_minute',
      base_rate: 0.03,
      minimum_charge: 0.0,
      rounding_method: 'ceil',
      rounding_increment: 1,
      free_seconds: 120,
      currency: 'USD',
      billing_cycle: 30,
      grace_period_days: 30,
      low_balance_threshold: 0.0,
      auto_recharge: false,
      auto_recharge_amount: null,
      auto_recharge_threshold: null,
      effective_from: null,
      effective_to: null,
      metadata: {
        category: 'voice',
        tier: 'enterprise',
        features: ['free_two_minutes', 'extended_grace_period'],
      },
    },
    {
      id: uuidv4(),
      organization_id: orgId,
      name: 'SMS Standard',
      type: 'prepaid',
      status: 'active',
      description: 'Standard SMS pricing',
      charge_type: 'per_sms',
      base_rate: 0.01,
      minimum_charge: 0.01,
      rounding_method: 'ceil',
      rounding_increment: 1,
      free_seconds: 0,
      currency: 'USD',
      billing_cycle: 30,
      grace_period_days: 7,
      low_balance_threshold: 5.0,
      auto_recharge: false,
      auto_recharge_amount: null,
      auto_recharge_threshold: null,
      effective_from: null,
      effective_to: null,
      metadata: {
        category: 'sms',
        tier: 'standard',
      },
    },
  ];

  for (const plan of ratePlans) {
    const exists = await ratePlanRepository.findOne({
      where: { organization_id: orgId, name: plan.name },
    });
    if (!exists) {
      await ratePlanRepository.save(plan);
      console.log(`  ✓ Created rate plan: ${plan.name}`);
    } else {
      console.log(`  - Rate plan already exists: ${plan.name}`);
    }
  }

  // Seed Customer Wallets
  const wallets = [
    {
      id: uuidv4(),
      organization_id: orgId,
      customer_id: 'CUST-001',
      balance: 100.0,
      currency: 'USD',
      status: 'active',
      low_balance_threshold: 10.0,
      auto_recharge: true,
      auto_recharge_amount: 50.0,
      auto_recharge_threshold: 5.0,
      last_recharge_date: null,
      last_debit_date: null,
      total_credited: 100.0,
      total_debited: 0.0,
      total_refunded: 0.0,
      lifetime_value: 100.0,
      metadata: {
        customer_type: 'premium',
        payment_method: 'credit_card',
      },
    },
    {
      id: uuidv4(),
      organization_id: orgId,
      customer_id: 'CUST-002',
      balance: 25.0,
      currency: 'USD',
      status: 'active',
      low_balance_threshold: 10.0,
      auto_recharge: false,
      auto_recharge_amount: null,
      auto_recharge_threshold: null,
      last_recharge_date: null,
      last_debit_date: null,
      total_credited: 25.0,
      total_debited: 0.0,
      total_refunded: 0.0,
      lifetime_value: 25.0,
      metadata: {
        customer_type: 'standard',
        payment_method: 'bank_transfer',
      },
    },
    {
      id: uuidv4(),
      organization_id: orgId,
      customer_id: 'CUST-003',
      balance: 5.0,
      currency: 'USD',
      status: 'active',
      low_balance_threshold: 10.0,
      auto_recharge: false,
      auto_recharge_amount: null,
      auto_recharge_threshold: null,
      last_recharge_date: null,
      last_debit_date: null,
      total_credited: 5.0,
      total_debited: 0.0,
      total_refunded: 0.0,
      lifetime_value: 5.0,
      metadata: {
        customer_type: 'standard',
        payment_method: 'prepaid_voucher',
        notes: 'Low balance - needs recharge',
      },
    },
  ];

  for (const wallet of wallets) {
    const exists = await walletRepository.findOne({
      where: { organization_id: orgId, customer_id: wallet.customer_id },
    });
    if (!exists) {
      await walletRepository.save(wallet);
      console.log(`  ✓ Created wallet for customer: ${wallet.customer_id}`);
    } else {
      console.log(`  - Wallet already exists for customer: ${wallet.customer_id}`);
    }
  }

  console.log('Rating engine seed completed!');
}
