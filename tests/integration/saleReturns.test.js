import dotenv from 'dotenv';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { database } from '../../src/config/index.js';
import createApp from '../../src/app.js';
import {
    Company,
    Branch,
    Cashier,
    Category,
    Product,
    SubscriptionPlan,
    PaymentMethod,
} from '../../src/models/index.js';
import { activateCompanySubscription } from '../../src/helpers/dashboard/subscriptionService.js';

dotenv.config();

const TEST_PASSWORD = 'SaleReturnTest1!';
const DEVICE_ID = 'sale-return-test-device-0001';
const runIntegration = process.env.RUN_INTEGRATION_TESTS === '1';

describe.runIf(runIntegration)('sale returns API (integration)', () => {
    let app;
    let authToken;
    let testEmail;
    let productId;
    let saleId;
    let saleItemId;
    let cashPaymentMethodId;

    beforeAll(async () => {
        await database.connect();
        app = createApp();

        const plan = await SubscriptionPlan.findOne({
            where: { platform: 'desktop', deploymentTier: 'online', isActive: true },
        });
        if (!plan) throw new Error('Online desktop plan missing — run db:migrate && db:seed');

        testEmail = `sale.return.test.${Date.now()}@goldpos.test`;

        const company = await Company.create({
            name: 'Sale Return Test Co',
            phone: '01000009999',
            status: 'pending',
        });

        const branch = await Branch.create({
            companyId: company.id,
            name: 'Return Branch',
            status: 'active',
        });

        await Cashier.create({
            branchId: branch.id,
            name: 'Return Tester',
            email: testEmail,
            phone: `010${String(Date.now()).slice(-8)}`,
            password: TEST_PASSWORD,
            status: 'active',
            active: true,
            language: 'ar',
        });

        await activateCompanySubscription({
            companyId: company.id,
            subscriptionPlanId: plan.id,
            adminId: null,
            notes: 'sale return integration test',
        });

        const signin = await request(app)
            .post('/api/v1/auth/signin')
            .set('x-platform', 'desktop')
            .set('lang', 'ar')
            .send({
                email: testEmail,
                password: TEST_PASSWORD,
                deviceId: DEVICE_ID,
                deviceType: 'web',
            });

        expect(signin.status).toBe(200);
        authToken = signin.body.data.token;

        const category = await Category.create({
            name: `مرتجع-${Date.now()}`,
            companyId: company.id,
            branchId: branch.id,
        });

        const product = await Product.create({
            barcode: `RET${Date.now()}`,
            name: 'عصير',
            companyId: company.id,
            branchId: branch.id,
            category_id: category.id,
            cost_price: 10,
            sale_price_1: 20,
            sale_price_2: 19,
            sale_price_3: 18,
            quantity: 50,
            reorder_level: 5,
            tax_percent: 0,
            status: 'active',
        });
        productId = product.id;

        const cashMethod = await PaymentMethod.findOne({ where: { code: 'cash', isActive: true } });
        if (!cashMethod) {
            throw new Error('Payment methods missing — run db:migrate && db:seed');
        }
        cashPaymentMethodId = cashMethod.id;
    }, 90000);

    afterAll(async () => {
        await database.disconnect();
    });

    const withAuth = (req) =>
        req
            .set('Authorization', `Bearer ${authToken}`)
            .set('x-platform', 'desktop')
            .set('lang', 'ar');

    it('creates cash sale then partial return restores stock and cashbox', async () => {
        const createRes = await withAuth(request(app).post('/api/v1/sales')).send({
            items: [{ productId, qty: 4, price: 20 }],
            paymentMethodId: cashPaymentMethodId,
            paidAmount: 80,
        });

        expect(createRes.status).toBe(200);
        saleId = createRes.body.data.id;
        saleItemId = createRes.body.data.items[0].id;

        const productAfterSale = await Product.findByPk(productId);
        expect(Number(productAfterSale.quantity)).toBe(46);

        const returnableRes = await withAuth(request(app).get(`/api/v1/sales/${saleId}/returnable`));
        expect(returnableRes.status).toBe(200);
        expect(returnableRes.body.data.items[0].returnable_qty).toBe(4);

        const calcRes = await withAuth(request(app).post('/api/v1/sale-returns/calculate')).send({
            saleId,
            items: [{ saleItemId, qty: 1 }],
        });
        expect(calcRes.status).toBe(200);
        expect(calcRes.body.data.return_total).toBe(20);

        const returnRes = await withAuth(request(app).post('/api/v1/sale-returns')).send({
            saleId,
            items: [{ saleItemId, qty: 1 }],
            notes: 'تالف',
        });
        expect(returnRes.status).toBe(200);
        expect(returnRes.body.code).toBe(201);
        expect(returnRes.body.data.return_no).toMatch(/^R-/);
        expect(returnRes.body.data.total).toBe(20);

        const saleAfter = await withAuth(request(app).get(`/api/v1/sales/${saleId}`));
        expect(saleAfter.body.data.total).toBe(60);
        expect(saleAfter.body.data.paid_amount).toBe(60);
        expect(saleAfter.body.data.items[0].returned_qty).toBe(1);
        expect(saleAfter.body.data.items[0].net_qty).toBe(3);
        expect(saleAfter.body.data.payments[0].amount).toBe(60);
        expect(saleAfter.body.data.returns_summary.total).toBe(20);

        const calcSecond = await withAuth(request(app).post('/api/v1/sale-returns/calculate')).send({
            saleId,
            items: [{ saleItemId, qty: 1 }],
        });
        expect(calcSecond.status).toBe(200);
        expect(calcSecond.body.data.return_total).toBe(20);
        expect(calcSecond.body.data.updated_sale.total).toBe(40);

        const productAfterReturn = await Product.findByPk(productId);
        expect(Number(productAfterReturn.quantity)).toBe(47);

        const shiftRes = await withAuth(request(app).get('/api/v1/cashbox/shift-summary'));
        expect(shiftRes.status).toBe(200);
        expect(shiftRes.body.data.drawer.salesCashIn).toBeGreaterThanOrEqual(60);
        expect(shiftRes.body.data.drawer.saleReturnsOut).toBeGreaterThanOrEqual(20);
    });

    it('rejects return qty greater than available', async () => {
        const res = await withAuth(request(app).post('/api/v1/sale-returns')).send({
            saleId,
            items: [{ saleItemId, qty: 99 }],
        });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});
