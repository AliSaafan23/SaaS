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
        const custCell = (name, avatar) =>
            `<div class="saas-cust"><span class="saas-cust__av">${
                avatar ? `<img src="${avatar}" alt="">` : '<i class="fas fa-user"></i>'
            }</span><span>${name || '—'}</span></div>`;

        tbody.innerHTML = rows
            .map(
                (p) => `<tr>
            <td>#${p.id}</td>
            <td>#${p.invoiceId}</td>
            <td>${custCell(p.customerName, p.customerAvatar)}</td>
            <td><span class="saas-money">${PosApi.formatMoney(p.amount)}</span></td>
            <td>${p.paymentDate}</td></tr>`
            )
            .join('');
    };

    // Prefill from the "collect" button on the invoices page (?invoice=&amount=)
    const params = new URLSearchParams(window.location.search);
    const preInvoice = params.get('invoice');
    const preAmount = params.get('amount');
    if (preInvoice) {
        form.querySelector('[name="invoiceId"]').value = preInvoice;
        if (preAmount) form.querySelector('[name="amount"]').value = preAmount;
        const dateEl = form.querySelector('[name="paymentDate"]');
        if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().slice(0, 10);
        form.querySelector('[name="invoiceId"]').focus();
    }

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const body = Object.fromEntries(fd.entries());
        body.invoiceId = Number(String(body.invoiceId).replace(/[^0-9]/g, ''));
        body.amount = Number(body.amount);
        if (!body.paymentDate) delete body.paymentDate;
        const res = await PosApi.request('/payments', { method: 'POST', body: JSON.stringify(body) });
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        form.reset();
        PosApi.showAlert(alertEl, res.message, 'success');
        load();
    });

    load();
});

