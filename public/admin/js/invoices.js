document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#invoicesTable tbody');
    const alertEl = document.getElementById('invoiceAlert');
    const runBtn = document.getElementById('runBillingBtn');

    const load = async () => {
        const res = await PosApi.request('/invoices');
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        const rows = res.data || [];
        if (!rows.length) {
            tbody.innerHTML = SaasUI.emptyState('fa-file-invoice-dollar', PosApi.t('common.noData', 'No data yet'));
            return;
        }
        tbody.innerHTML = rows
            .map(
                (i) => `<tr>
            <td>#${i.id}</td>
            <td><span class="saas-money">${PosApi.formatMoney(i.amount)}</span></td>
            <td>${SaasUI.statusBadge(i.status)}</td>
            <td><small>${i.periodStart} → ${i.periodEnd}</small></td>
            <td>${i.issueDate}</td></tr>`
            )
            .join('');
    };

    runBtn?.addEventListener('click', async () => {
        runBtn.disabled = true;
        const res = await PosApi.request('/billing/run', { method: 'POST', body: '{}' });
        runBtn.disabled = false;
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        PosApi.showAlert(alertEl, `${res.message} (${res.data?.count || 0})`, 'success');
        load();
    });

    load();
});
