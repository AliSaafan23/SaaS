const toPlain = (row) => (row?.toJSON ? row.toJSON() : row);

const tenantLogoUrl = (logo) =>
    logo ? `/assets/uploads/tenants/${logo}` : null;

const customerAvatarUrl = (avatar) =>
    avatar ? `/assets/uploads/customers/${avatar}` : null;

const userAvatarUrl = (avatar) =>
    avatar ? (/^(https?:|\/)/.test(avatar) ? avatar : `/assets/uploads/users/${avatar}`) : null;

export default {
    tenantUserProfile(user) {
        const u = toPlain(user);
        return {
            id: u.id,
            tenantId: u.tenantId,
            name: u.name,
            email: u.email,
            avatar: userAvatarUrl(u.avatar),
            status: u.status,
            emailVerified: u.emailVerified,
            role: u.role
                ? {
                      id: u.role.id,
                      name: u.role.name,
                      slug: u.role.slug,
                      permissions: u.role.permissions,
                  }
                : undefined,
            tenant: u.tenant
                ? {
                      id: u.tenant.id,
                      name: u.tenant.name,
                      slug: u.tenant.slug,
                      logo: tenantLogoUrl(u.tenant.logo),
                      companyEmail: u.tenant.companyEmail,
                  }
                : undefined,
        };
    },

    plan(plan) {
        const p = toPlain(plan);
        return {
            id: p.id,
            name: p.name,
            description: p.description,
            price: Number(p.price),
            billingCycle: p.billingCycle,
            currency: p.currency,
            isActive: p.isActive,
        };
    },

    customer(customer) {
        const c = toPlain(customer);
        return {
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            status: c.status,
            avatar: customerAvatarUrl(c.avatar),
        };
    },

    subscription(sub) {
        const s = toPlain(sub);
        return {
            id: s.id,
            customerId: s.customerId,
            planId: s.planId,
            startDate: s.startDate,
            status: s.status,
            nextBillingDate: s.nextBillingDate,
            customer: s.customer ? this.customer(s.customer) : undefined,
            plan: s.plan ? this.plan(s.plan) : undefined,
        };
    },

    invoice(invoice) {
        const i = toPlain(invoice);
        return {
            id: i.id,
            customerId: i.customerId,
            subscriptionId: i.subscriptionId,
            amount: Number(i.amount),
            status: i.status,
            periodStart: i.periodStart,
            periodEnd: i.periodEnd,
            issueDate: i.issueDate,
            revenueRecognizedAt: i.revenueRecognizedAt,
            customerName: i.customer?.name,
            customerAvatar: customerAvatarUrl(i.customer?.avatar),
            planName: i.subscription?.plan?.name,
        };
    },

    payment(payment) {
        const p = toPlain(payment);
        return {
            id: p.id,
            invoiceId: p.invoiceId,
            amount: Number(p.amount),
            paymentDate: p.paymentDate,
            customerName: p.invoice?.customer?.name,
            customerAvatar: customerAvatarUrl(p.invoice?.customer?.avatar),
        };
    },
};
