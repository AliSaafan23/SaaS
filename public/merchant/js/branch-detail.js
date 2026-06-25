(function () {
    const page = document.querySelector('.mpr-dash-page');
    const branchId = page?.dataset?.branchId;
    if (!branchId) return;

    const toYmd = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const setDefaultPeriod = () => {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 29);
        const fromEl = document.getElementById('branchPeriodFrom');
        const toEl = document.getElementById('branchPeriodTo');
        if (fromEl) fromEl.value = toYmd(from);
        if (toEl) toEl.value = toYmd(to);
    };

    const getPeriod = () => ({
        from: document.getElementById('branchPeriodFrom')?.value || '',
        to: document.getElementById('branchPeriodTo')?.value || '',
    });

    const buildQs = () => {
        const qs = new URLSearchParams();
        const period = getPeriod();
        if (period.from) qs.set('from', period.from);
        if (period.to) qs.set('to', period.to);
        return qs.toString();
    };

    const setLoading = (el, on) => el?.classList.toggle('mpr-is-loading', on);

    const loadOverview = async () => {
        const panel = document.getElementById('branchMetricsPanel');
        setLoading(panel, true);
        try {
            const res = await MerchantApi.request(`/stats/branches/${branchId}/overview?${buildQs()}`);
            if (!MerchantApi.isSuccess(res) || !res.data) return;

            const d = res.data;
            document.getElementById('branchRevenue').textContent = MerchantApi.formatMoney(d.revenue);
            document.getElementById('branchInvoices').textContent = MerchantApi.tpl('dashboard.invoicesCount', {
                count: MerchantApi.formatNum(d.invoices),
            });
            document.getElementById('branchProfit').textContent = MerchantApi.formatMoney(d.profit);
            document.getElementById('branchCashiers').textContent = MerchantApi.formatNum(d.cashierCount);
            document.getElementById('branchProductCount').textContent = MerchantApi.formatNum(d.productCount);
            document.getElementById('branchLowStockCount').textContent = MerchantApi.tpl('branchDetail.lowStockCount', {
                count: MerchantApi.formatNum(d.lowStockCount),
            });

            const banner = document.getElementById('branchLowStockBanner');
            const bannerText = document.getElementById('branchLowStockText');
            if (banner && d.lowStockCount > 0) {
                banner.classList.remove('d-none');
                if (bannerText) {
                    bannerText.textContent = MerchantApi.tpl('branchDetail.lowStockBanner', {
                        count: MerchantApi.formatNum(d.lowStockCount),
                    });
                }
            } else if (banner) {
                banner.classList.add('d-none');
            }

            renderTopProducts(d.topProducts || []);
        } finally {
            setLoading(panel, false);
        }
    };

    const renderStock = (rows = []) => {
        const tbody = document.querySelector('#branchStockTable tbody');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${MerchantApi.t('common.noData')}</td></tr>`;
            return;
        }
        tbody.innerHTML = rows
            .map(
                (p) => `
            <tr class="${p.isLow ? 'mpr-row-warning' : ''}">
                <td><strong>${p.name}</strong></td>
                <td>${p.barcode || '—'}</td>
                <td>${MerchantApi.formatNum(p.quantity)}</td>
                <td>${MerchantApi.formatNum(p.reorderLevel)}</td>
                <td>${p.isLow ? `<span class="mpr-badge-warning">${MerchantApi.t('branchDetail.lowStock', 'نقص')}</span>` : `<span class="mpr-badge-ok">${MerchantApi.t('branchDetail.inStock', 'متوفر')}</span>`}</td>
            </tr>`
            )
            .join('');
    };

    const loadStock = async () => {
        const panel = document.getElementById('tab-stock');
        setLoading(panel, true);
        try {
            const res = await MerchantApi.request(`/stats/branches/${branchId}/stock`);
            if (MerchantApi.isSuccess(res)) renderStock(res.data || []);
        } finally {
            setLoading(panel, false);
        }
    };

    const loadCustomers = async () => {
        const tbody = document.querySelector('#branchCustomersTable tbody');
        const res = await MerchantApi.request(`/stats/branches/${branchId}/customers`);
        if (!MerchantApi.isSuccess(res) || !res.data?.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">${MerchantApi.t('common.noData')}</td></tr>`;
            return;
        }
        tbody.innerHTML = res.data
            .map(
                (c) => `
            <tr>
                <td>${c.code || '—'}</td>
                <td><strong>${c.name}</strong></td>
                <td>${c.phone || '—'}</td>
                <td>${c.address || '—'}</td>
            </tr>`
            )
            .join('');
    };

    const loadSuppliers = async () => {
        const tbody = document.querySelector('#branchSuppliersTable tbody');
        const res = await MerchantApi.request(`/stats/branches/${branchId}/suppliers`);
        if (!MerchantApi.isSuccess(res) || !res.data?.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">${MerchantApi.t('common.noData')}</td></tr>`;
            return;
        }
        tbody.innerHTML = res.data
            .map(
                (s) => `
            <tr>
                <td>${s.code || '—'}</td>
                <td><strong>${s.name}</strong></td>
                <td>${s.phone || '—'}</td>
                <td>${s.address || '—'}</td>
            </tr>`
            )
            .join('');
    };

    const renderTopProducts = (rows = []) => {
        const tbody = document.querySelector('#branchTopProductsTable tbody');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">${MerchantApi.t('common.noData')}</td></tr>`;
            return;
        }
        tbody.innerHTML = rows
            .map(
                (p) => `
            <tr>
                <td><strong>${p.label}</strong></td>
                <td>${MerchantApi.formatNum(p.qty)}</td>
                <td>${MerchantApi.formatMoney(p.revenue)}</td>
            </tr>`
            )
            .join('');
    };

    const initTabs = () => {
        const tabs = document.querySelectorAll('.mpr-tab');
        const panels = document.querySelectorAll('.mpr-tab-panel');
        let customersLoaded = false;
        let suppliersLoaded = false;

        tabs.forEach((tab) => {
            tab.addEventListener('click', async () => {
                const name = tab.dataset.tab;
                tabs.forEach((t) => t.classList.toggle('active', t === tab));
                panels.forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));

                if (name === 'customers' && !customersLoaded) {
                    customersLoaded = true;
                    await loadCustomers();
                }
                if (name === 'suppliers' && !suppliersLoaded) {
                    suppliersLoaded = true;
                    await loadSuppliers();
                }
            });
        });
    };

    const reload = async () => {
        await Promise.all([loadOverview(), loadStock()]);
    };

    document.addEventListener('DOMContentLoaded', () => {
        setDefaultPeriod();
        void (async () => {
            try {
                await window.MerchantI18n?.init?.();
            } catch (e) {
                console.warn(e);
            }
            initTabs();
            await reload();
        })();

        document.getElementById('refreshBranchDetail')?.addEventListener('click', reload);
        document.getElementById('applyBranchPeriod')?.addEventListener('click', reload);
    });
})();
