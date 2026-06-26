const toPlain = (row) => (row?.toJSON ? row.toJSON() : row);

export default {
    tenantUserProfile(user) {
        const u = toPlain(user);
        return {
            id: u.id,
            tenantId: u.tenantId,
            name: u.name,
            email: u.email,
            status: u.status,
            tenant: u.tenant
                ? {
                      id: u.tenant.id,
                      name: u.tenant.name,
                      slug: u.tenant.slug,
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
        };
    },

    payment(payment) {
        const p = toPlain(payment);
        return {
            id: p.id,
            invoiceId: p.invoiceId,
            amount: Number(p.amount),
            paymentDate: p.paymentDate,
        };
    },
};
