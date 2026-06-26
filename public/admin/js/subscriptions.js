document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#subsTable tbody');
    const form = document.getElementById('subForm');
    const alertEl = document.getElementById('subAlert');
    const customerSel = document.getElementById('subCustomer');
    const planSel = document.getElementById('subPlan');

    const loadOptions = async () => {
        const [customers, plans] = await Promise.all([
            PosApi.request('/customers'),
            PosApi.request('/plans'),
        ]);
        customerSel.innerHTML = (customers.data || [])
            .map((c) => `<option value="${c.id}">${c.name}</option>`)
            .join('');
        planSel.innerHTML = (plans.data || [])
            .map((p) => `<option value="${p.id}">${p.name} — ${PosApi.formatMoney(p.price)}</option>`)
            .join('');
    };

    const load = async () => {
        const res = await PosApi.request('/subscriptions');
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        const rows = res.data || [];
        if (!rows.length) {
            tbody.innerHTML = SaasUI.emptyState('fa-sync-alt', PosApi.t('common.noData', 'No data yet'));
            return;
        }
        tbody.innerHTML = rows
            .map(
                (s) => `<tr>
            <td>#${s.id}</td>
            <td><strong>${s.customer?.name || s.customerId}</strong></td>
            <td>${s.plan?.name || s.planId}</td>
            <td>${s.startDate}</td>
            <td>${s.nextBillingDate}</td>
            <td>${SaasUI.statusBadge(s.status)}</td></tr>`
            )
            .join('');
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const body = Object.fromEntries(fd.entries());
        const res = await PosApi.request('/subscriptions', { method: 'POST', body: JSON.stringify(body) });
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        form.reset();
        PosApi.showAlert(alertEl, res.message, 'success');
        load();
    });

    loadOptions().then(load);
});
