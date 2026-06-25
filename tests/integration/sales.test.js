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

const TEST_PASSWORD = 'SalesTest1!';
const DEVICE_ID = 'sales-test-device-0001';
const runIntegration = process.env.RUN_INTEGRATION_TESTS === '1';

describe.runIf(runIntegration)('sales API (integration)', () => {
    let app;
    let authToken;
    let testEmail;
    let productId;
    let saleId;
    let cashPaymentMethodId;

    beforeAll(async () => {
        await database.connect();
        app = createApp();

        const plan = await SubscriptionPlan.findOne({
            where: { platform: 'desktop', deploymentTier: 'online', isActive: true },
        });
        if (!plan) throw new Error('Online desktop plan missing — run db:migrate && db:seed');

        testEmail = `sales.test.${Date.now()}@goldpos.test`;

        const company = await Company.create({
            name: 'Sales Test Co',
            phone: '01000008888',
            status: 'pending',
        });

        const branch = await Branch.create({
            companyId: company.id,
            name: 'Sales Branch',
            status: 'active',
        });

        await Cashier.create({
            branchId: branch.id,
            name: 'Sales Tester',
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
            notes: 'sales integration test',
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
            name: `مشروبات-${Date.now()}`,
            companyId: company.id,
            branchId: branch.id,
        });

        const product = await Product.create({
            barcode: `TST${Date.now()}`,
            name: 'بيبسي',
            companyId: company.id,
            branchId: branch.id,
            category_id: category.id,
            cost_price: 15,
            sale_price_1: 25,
            sale_price_2: 24,
            sale_price_3: 23,
            quantity: 100,
            reorder_level: 5,
            tax_percent: 0,
            status: 'active',
        });
        productId = product.id;

        const cashMethod = await PaymentMethod.findOne({ where: { code: 'cash', isActive: true } });
        if (!cashMethod) {
            throw new Error('Cash payment method missing — run db:migrate && db:seed');
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

    it('GET /api/v1/sales/meta returns next invoice number', async () => {
        const res = await withAuth(request(app).get('/api/v1/sales/meta'));
        expect(res.status).toBe(200);
        expect(res.body.data.nextInvoiceNo).toBeTruthy();
    });

    it('GET /api/v1/payment-methods returns active methods', async () => {
        const res = await withAuth(request(app).get('/api/v1/payment-methods'));
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.some((m) => m.code === 'cash')).toBe(true);
    });

    it('POST /api/v1/sales/calculate previews totals', async () => {
        const res = await withAuth(request(app).post('/api/v1/sales/calculate')).send({
            items: [{ productId, qty: 1 }],
            paidAmount: 25,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.total).toBe(25);
        expect(res.body.data.due_amount).toBe(0);
    });

    it('POST /api/v1/sales creates invoice and deducts stock', async () => {
        const res = await withAuth(request(app).post('/api/v1/sales')).send({
            items: [{ productId, qty: 2, price: 25 }],
            paymentMethodId: cashPaymentMethodId,
            paidAmount: 50,
            salePriceType: 1,
        });

        expect(res.status).toBe(200);
        expect(res.body.code).toBe(201);
        expect(res.body.data.invoice_no).toBeTruthy();
        expect(res.body.data.total).toBe(50);
        expect(res.body.data.payment_method_id).toBe(cashPaymentMethodId);
        expect(res.body.data.paymentMethod?.id).toBe(cashPaymentMethodId);
        expect(res.body.data.items).toHaveLength(1);
        saleId = res.body.data.id;

        const product = await Product.findByPk(productId);
        expect(Number(product.quantity)).toBe(98);
    });

    it('GET /api/v1/sales/:id returns saved invoice', async () => {
        const res = await withAuth(request(app).get(`/api/v1/sales/${saleId}`));
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(saleId);
        expect(res.body.data.status).toBe('completed');
    });

    it('PUT /api/v1/sales/:id updates qty and stock', async () => {
        const res = await withAuth(request(app).put(`/api/v1/sales/${saleId}`)).send({
            items: [{ productId, qty: 1, price: 25 }],
            paymentMethodId: cashPaymentMethodId,
            paidAmount: 25,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.total).toBe(25);

        const product = await Product.findByPk(productId);
        expect(Number(product.quantity)).toBe(99);
    });

    it('PATCH /api/v1/sales/:id/cancel restores stock', async () => {
        const res = await withAuth(request(app).patch(`/api/v1/sales/${saleId}/cancel`));
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('cancelled');

        const product = await Product.findByPk(productId);
        expect(Number(product.quantity)).toBe(100);
    });
});
