document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#returnsTable tbody');
    const t = (k, fb) => MerchantApi.t(k, fb);

    function defaultDates() {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 30);
        document.getElementById('filterTo').value = to.toISOString().slice(0, 10);
        document.getElementById('filterFrom').value = from.toISOString().slice(0, 10);
    }

    function queryString() {
        const params = new URLSearchParams();
        const branchId = document.getElementById('filterBranch').value;
        const from = document.getElementById('filterFrom').value;
        const to = document.getElementById('filterTo').value;
        if (branchId) params.set('branchId', branchId);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        return params.toString();
    }

    async function load() {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${t('common.loading')}</td></tr>`;

        const res = await MerchantApi.request(`/stats/sale-returns?${queryString()}`);
        if (res.key !== 'success') {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${t('common.loadFailed')}</td></tr>`;
            return;
        }

        const { items = [], summary = {} } = res.data || {};
        document.getElementById('statReturnCount').textContent = summary.count ?? 0;
        document.getElementById('statReturnTotal').textContent = MerchantApi.formatMoney(summary.totalAmount);

        if (!items.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${t('common.noData')}</td></tr>`;
            return;
        }

        tbody.innerHTML = items
            .map(
                (row) => `
            <tr>
                <td>${row.return_no || '—'}</td>
                <td>${row.invoice_no || row.sale_id || '—'}</td>
                <td>${row.branch?.name || '—'}</td>
                <td>${row.customer?.name || '—'}</td>
                <td>${MerchantApi.formatMoney(row.total)}</td>
                <td>${MerchantApi.formatDate(row.createdAt)}</td>
            </tr>
        `
            )
            .join('');
    }

    defaultDates();
    document.getElementById('filterBtn')?.addEventListener('click', load);
    window.onMerchantLangChange = () => {
        MerchantI18n.apply();
        load();
    };

    load();
});
