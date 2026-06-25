import dotenv from 'dotenv';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { database } from '../../src/config/index.js';
import createApp from '../../src/app.js';
import {
    Company,
    Branch,
    Cashier,
    SubscriptionPlan,
} from '../../src/models/index.js';
import { activateCompanySubscription } from '../../src/helpers/dashboard/subscriptionService.js';

dotenv.config();

const DEVICE_ID = 'offline-test-device-0001';
const TEST_PASSWORD = 'OfflineTest1!';
const runIntegration = process.env.RUN_INTEGRATION_TESTS === '1';

describe.runIf(runIntegration)('offline license API (integration)', () => {
    let app;
    let testEmail;
    let offlineDesktopPlanId;
    let licenseToken;

    beforeAll(async () => {
        await database.connect();
        app = createApp();

        const plan = await SubscriptionPlan.findOne({
            where: { platform: 'desktop', deploymentTier: 'offline', isActive: true },
        });

        if (!plan) {
            throw new Error('Offline desktop plan missing — run db:migrate && db:seed');
        }

        offlineDesktopPlanId = plan.id;
        testEmail = `offline.test.${Date.now()}@goldpos.test`;

        const company = await Company.create({
            name: 'Offline Test Co',
            phone: '01000009999',
            status: 'pending',
        });

        const branch = await Branch.create({
            companyId: company.id,
            name: 'Main Branch',
            status: 'active',
        });

        await Cashier.create({
            branchId: branch.id,
            name: 'Offline Tester',
            email: testEmail,
            phone: `010${String(Date.now()).slice(-8)}`,
            password: TEST_PASSWORD,
            status: 'active',
            active: true,
            language: 'ar',
        });

        await activateCompanySubscription({
            companyId: company.id,
            subscriptionPlanId: offlineDesktopPlanId,
            adminId: null,
            notes: 'integration test activation',
        });
    }, 60000);

    afterAll(async () => {
        await database.disconnect();
    });

    it('GET /api/v1/license/schema returns dto metadata', async () => {
        const res = await request(app).get('/api/v1/license/schema');
        expect(res.status).toBe(200);
        expect(res.body.data.dtoVersion).toBe(1);
        expect(res.body.data.entities).toContain('product');
    });

    it('POST /api/v1/license/activate issues offline license', async () => {
        const res = await request(app)
            .post('/api/v1/license/activate')
            .set('x-platform', 'desktop')
            .send({
                email: testEmail,
                password: TEST_PASSWORD,
                deviceId: DEVICE_ID,
                deviceType: 'web',
                includeBootstrap: true,
            });

        expect(res.status).toBe(200);
        expect(res.body.data.deploymentTier).toBe('offline');
        expect(res.body.data.license?.token).toBeTruthy();
        expect(res.body.data.offlineLicense?.required).toBe(true);
        expect(res.body.data.bootstrap?.products).toBeDefined();

        licenseToken = res.body.data.license.token;
    });

    it('POST /api/v1/license/refresh renews license token', async () => {
        const res = await request(app)
            .post('/api/v1/license/refresh')
            .set('Authorization', `Bearer ${licenseToken}`)
            .send({ deviceId: DEVICE_ID });

        expect(res.status).toBe(200);
        expect(res.body.data.license?.token).toBeTruthy();
        licenseToken = res.body.data.license.token;
    });

    it('GET /api/v1/license/bootstrap returns catalog snapshot', async () => {
        const res = await request(app)
            .get('/api/v1/license/bootstrap')
            .set('Authorization', `Bearer ${licenseToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.branchId).toBeTruthy();
        expect(Array.isArray(res.body.data.products)).toBe(true);
    });

    it('rejects activate for online-only subscription', async () => {
        const onlinePlan = await SubscriptionPlan.findOne({
            where: { platform: 'desktop', deploymentTier: 'online', isActive: true },
        });

        if (!onlinePlan) return;

        const email = `online.only.${Date.now()}@goldpos.test`;
        const company = await Company.create({
            name: 'Online Only Co',
            phone: '01000008888',
            status: 'pending',
        });
        const branch = await Branch.create({
            companyId: company.id,
            name: 'Branch',
            status: 'active',
        });
        await Cashier.create({
            branchId: branch.id,
            name: 'Online Cashier',
            email,
            phone: `011${String(Date.now()).slice(-8)}`,
            password: TEST_PASSWORD,
            status: 'active',
            active: true,
            language: 'ar',
        });
        await activateCompanySubscription({
            companyId: company.id,
            subscriptionPlanId: onlinePlan.id,
            adminId: null,
            notes: 'online only test',
        });

        const res = await request(app)
            .post('/api/v1/license/activate')
            .set('x-platform', 'desktop')
            .send({
                email,
                password: TEST_PASSWORD,
                deviceId: 'online-device-0001',
                deviceType: 'web',
            });

        expect(res.status).toBe(400);
        expect(res.body.key).toBe('fail');
    });
});
