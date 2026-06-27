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
        const custCell = (name, avatar) =>
            `<div class="saas-cust"><span class="saas-cust__av">${
                avatar ? `<img src="${avatar}" alt="">` : '<i class="fas fa-user"></i>'
            }</span><span>${name || '—'}</span></div>`;

        tbody.innerHTML = rows
            .map((i) => {
                const payBtn =
                    i.status === 'open'
                        ? `<a class="btn saas-btn-soft saas-btn-sm" href="/dashboard/ui/payments?invoice=${i.id}&amount=${i.amount}"><i class="fas fa-hand-holding-dollar"></i> ${PosApi.t('invoices.collect', 'تحصيل')}</a>`
                        : '';
                return `<tr>
            <td>#${i.id}</td>
            <td>${custCell(i.customerName, i.customerAvatar)}</td>
            <td>${i.planName || '—'}</td>
            <td><span class="saas-money">${PosApi.formatMoney(i.amount)}</span></td>
            <td>${SaasUI.statusBadge(i.status)}</td>
            <td><small>${i.periodStart} → ${i.periodEnd}</small></td>
            <td>${i.issueDate}</td>
            <td class="saas-row-actions">${payBtn}</td></tr>`;
            })
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

