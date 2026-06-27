/**
 * Seed demo data for a tenant (by admin email).
 * Usage: node scripts/seed-demo.js [adminEmail]
 *
 * Creates: plans, customers, subscriptions, 6 months of invoices,
 * payments, and revenue recognition — so the dashboard, charts and
 * financial reports show realistic data.
 */
import 'dotenv/config';
import {
    sequelize,
    TenantUser,
    Plan,
    Customer,
    Subscription,
} from '../src/models/index.js';
import { runMonthlyBilling } from '../src/helpers/accounting/billingService.js';
import { recordPayment } from '../src/helpers/accounting/paymentService.js';
import { runRevenueRecognition } from '../src/helpers/accounting/revenueService.js';
import { Invoice } from '../src/models/index.js';

const EMAIL = (process.argv[2] || 'mahomudsheir@gmail.com').trim().toLowerCase();

const firstOfMonth = (monthsAgo) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    d.setMonth(d.getMonth() - monthsAgo);
    return d.toISOString().slice(0, 10);
};

const log = (...a) => console.log('[seed]', ...a);

async function run() {
    await sequelize.authenticate();
    log('DB connected');

    const admin = await TenantUser.findOne({ where: { email: EMAIL } });
    if (!admin) {
        throw new Error(`No tenant user found with email: ${EMAIL}`);
    }
    const tenantId = admin.tenantId;
    log(`Tenant #${tenantId} (admin: ${EMAIL})`);

    // ---- Plans ----
    const planDefs = [
        { name: 'Bronze', description: 'Basic monthly plan', price: 100, billingCycle: 'monthly', currency: 'USD' },
        { name: 'Silver', description: 'Standard monthly plan', price: 250, billingCycle: 'monthly', currency: 'USD' },
        { name: 'Gold', description: 'Premium monthly plan', price: 500, billingCycle: 'monthly', currency: 'USD' },
    ];
    const plans = [];
    for (const def of planDefs) {
        const [plan] = await Plan.findOrCreate({
            where: { tenantId, name: def.name },
            defaults: { tenantId, ...def, isActive: true },
        });
        plans.push(plan);
    }
    log(`Plans ready: ${plans.map((p) => p.name).join(', ')}`);

    // ---- Customers ----
    const customerDefs = [
        { name: 'Acme Corp', email: 'billing@acme.test', phone: '0100000001' },
        { name: 'Globex LLC', email: 'finance@globex.test', phone: '0100000002' },
        { name: 'Initech', email: 'accounts@initech.test', phone: '0100000003' },
        { name: 'Umbrella Co', email: 'pay@umbrella.test', phone: '0100000004' },
        { name: 'Soylent Inc', email: 'ar@soylent.test', phone: '0100000005' },
    ];
    const customers = [];
    for (const def of customerDefs) {
        const [c] = await Customer.findOrCreate({
            where: { tenantId, name: def.name },
            defaults: { tenantId, ...def, status: 'active' },
        });
        customers.push(c);
    }
    log(`Customers ready: ${customers.length}`);

    // ---- Subscriptions (start 6 months ago so we get a 6-month history) ----
    const startDate = firstOfMonth(6);
    const subPairs = [
        [customers[0], plans[0]],
        [customers[1], plans[2]],
        [customers[2], plans[1]],
        [customers[3], plans[0]],
        [customers[4], plans[2]],
    ];
    for (const [customer, plan] of subPairs) {
        await Subscription.findOrCreate({
            where: { tenantId, customerId: customer.id, planId: plan.id },
            defaults: {
                tenantId,
                customerId: customer.id,
                planId: plan.id,
                startDate,
                status: 'active',
                nextBillingDate: startDate,
            },
        });
    }
    log('Subscriptions ready');

    // ---- Billing: run for each of the last 6 months (spreads issueDate) ----
    let totalInvoices = 0;
    for (let m = 6; m >= 1; m--) {
        const runDate = firstOfMonth(m);
        const created = await runMonthlyBilling(tenantId, runDate);
        totalInvoices += created.length;
    }
    log(`Invoices created across 6 months: ${totalInvoices}`);

    // ---- Payments: pay ~80% of open invoices (paymentDate = issueDate) ----
    const openInvoices = await Invoice.findAll({ where: { tenantId, status: 'open' }, order: [['issueDate', 'ASC']] });
    let paid = 0;
    for (let i = 0; i < openInvoices.length; i++) {
        if (i % 5 === 4) continue; // leave ~20% unpaid (open A/R)
        const inv = openInvoices[i];
        try {
            await recordPayment({
                tenantId,
                invoiceId: inv.id,
                amount: inv.amount,
                paymentDate: inv.issueDate,
            });
            paid++;
        } catch (e) {
            log(`skip payment for invoice #${inv.id}: ${e.code || e.message}`);
        }
    }
    log(`Payments recorded: ${paid}`);

    // ---- Revenue recognition up to today ----
    const recognized = await runRevenueRecognition(tenantId, new Date().toISOString().slice(0, 10));
    log(`Revenue recognized for invoices: ${recognized.length}`);

    log('DONE ✓');
    await sequelize.close();
}

run().catch(async (err) => {
    console.error('[seed] ERROR:', err);
    try { await sequelize.close(); } catch {}
    process.exit(1);
});
