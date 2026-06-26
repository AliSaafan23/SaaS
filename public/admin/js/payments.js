document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#paymentsTable tbody');
    const form = document.getElementById('payForm');
    const alertEl = document.getElementById('payAlert');

    const load = async () => {
        const res = await PosApi.request('/payments');
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        const rows = res.data || [];
        if (!rows.length) {
            tbody.innerHTML = SaasUI.emptyState('fa-wallet', PosApi.t('common.noData', 'No data yet'));
            return;
        }
        tbody.innerHTML = rows
            .map(
                (p) => `<tr>
            <td>#${p.id}</td>
            <td>#${p.invoiceId}</td>
            <td><span class="saas-money">${PosApi.formatMoney(p.amount)}</span></td>
            <td>${p.paymentDate}</td></tr>`
            )
            .join('');
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const body = Object.fromEntries(fd.entries());
        body.invoiceId = Number(body.invoiceId);
        body.amount = Number(body.amount);
        const res = await PosApi.request('/payments', { method: 'POST', body: JSON.stringify(body) });
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        form.reset();
        PosApi.showAlert(alertEl, res.message, 'success');
        load();
    });

    load();
});
