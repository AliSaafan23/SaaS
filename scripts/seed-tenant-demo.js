import 'dotenv/config';
import { TenantUser, Plan, Customer, Subscription, Account } from '../src/models/index.js';
import { seedChartOfAccounts } from '../src/helpers/accounting/seedChartOfAccounts.js';
import { runMonthlyBilling } from '../src/helpers/accounting/billingService.js';
import { recordPayment } from '../src/helpers/accounting/paymentService.js';
import { runRevenueRecognition } from '../src/helpers/accounting/revenueService.js';
import { sequelize } from '../src/config/dbConfig.js';

const EMAIL = process.argv[2] || 'saafanali07@gmail.com';
const TODAY = new Date().toISOString().slice(0, 10);
const BILLING_START = '2026-05-01';

async function findOrCreate(model, where, defaults, label) {
    const [row, created] = await model.findOrCreate({ where, defaults });
    console.log(`${created ? '+' : '='} ${label}: ${row.name || row.id}`);
    return row;
}

async function main() {
    const user = await TenantUser.findOne({ where: { email: EMAIL.trim().toLowerCase() } });
    if (!user) {
        console.error(`User not found: ${EMAIL}`);
        process.exit(1);
    }

    const tenantId = user.tenantId;
    console.log(`Seeding tenant #${tenantId} (${EMAIL})...\n`);

    const accountCount = await Account.count({ where: { tenantId } });
    if (!accountCount) {
        await sequelize.transaction((t) => seedChartOfAccounts(tenantId, t));
        console.log('+ Chart of accounts seeded');
    }

    const bronze = await findOrCreate(
        Plan,
        { tenantId, name: 'Bronze' },
        { tenantId, name: 'Bronze', price: 100, billingCycle: 'monthly', currency: 'USD', description: 'Starter plan' },
        'Plan Bronze'
    );

    const gold = await findOrCreate(
        Plan,
        { tenantId, name: 'Gold' },
        { tenantId, name: 'Gold', price: 500, billingCycle: 'monthly', currency: 'USD', description: 'Premium plan' },
        'Plan Gold'
    );

    const ahmed = await findOrCreate(
        Customer,
        { tenantId, email: 'ahmed@demo.com' },
        { tenantId, name: 'أحمد محمود', email: 'ahmed@demo.com', phone: '+20100000001', status: 'active' },
        'Customer أحمد'
    );

    const sara = await findOrCreate(
        Customer,
        { tenantId, email: 'sara@demo.com' },
        { tenantId, name: 'سارة علي', email: 'sara@demo.com', phone: '+20100000002', status: 'active' },
        'Customer سارة'
    );

    const omar = await findOrCreate(
        Customer,
        { tenantId, email: 'omar@demo.com' },
        { tenantId, name: 'عمر حسن', email: 'omar@demo.com', phone: '+20100000003', status: 'active' },
        'Customer عمر'
    );

    const subs = [
        { customer: ahmed, plan: bronze },
        { customer: sara, plan: gold },
        { customer: omar, plan: bronze },
    ];

    for (const { customer, plan } of subs) {
        const existing = await Subscription.findOne({
            where: { tenantId, customerId: customer.id, planId: plan.id, status: 'active' },
        });
        if (existing) {
            console.log(`= Subscription #${existing.id}: ${customer.name} → ${plan.name}`);
            continue;
        }
        const sub = await Subscription.create({
            tenantId,
            customerId: customer.id,
            planId: plan.id,
            startDate: BILLING_START,
            nextBillingDate: BILLING_START,
            status: 'active',
        });
        console.log(`+ Subscription #${sub.id}: ${customer.name} → ${plan.name}`);
    }

    const invoices = await runMonthlyBilling(tenantId, TODAY);
    console.log(`\n+ Billing run: ${invoices.length} invoice(s) created`);

    for (const inv of invoices) {
        if (inv.amount <= 200) {
            await recordPayment({
                tenantId,
                invoiceId: inv.id,
                amount: inv.amount,
                paymentDate: TODAY,
            });
            console.log(`+ Payment recorded for invoice #${inv.id} ($${inv.amount})`);
        } else {
            console.log(`= Invoice #${inv.id} left open ($${inv.amount})`);
        }
    }

    const recognized = await runRevenueRecognition(tenantId, TODAY);
    console.log(`+ Revenue recognized for ${recognized.length} invoice(s)`);

    const summary = {
        plans: await Plan.count({ where: { tenantId } }),
        customers: await Customer.count({ where: { tenantId } }),
        subscriptions: await Subscription.count({ where: { tenantId } }),
    };

    console.log('\nDone! Dashboard summary:', summary);
    console.log(`Login: ${EMAIL} → refresh /dashboard/home`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
