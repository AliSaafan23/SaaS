(function () {
    const charts = {};
    const BRANCH_KEY = 'merchant-dashboard-branch';
    let filtersInitialized = false;

    const chartColors = {
        primary: 'rgba(0, 82, 204, 0.9)',
        primaryFill: 'rgba(0, 82, 204, 0.12)',
        success: 'rgba(34, 197, 94, 0.85)',
        cyan: 'rgba(0, 184, 217, 0.85)',
        violet: 'rgba(139, 92, 246, 0.85)',
        amber: 'rgba(245, 158, 11, 0.85)',
        gray: 'rgba(148, 163, 184, 0.55)',
    };

    const branchColors = [chartColors.cyan, chartColors.violet, chartColors.amber, chartColors.success, chartColors.primary, chartColors.gray];
    const fontFamily = 'Cairo, sans-serif';

    const toYmd = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const yAxisNice = (values, fallbackMax = 5) => {
        const max = Math.max(...values.map(Number), 0);
        if (max <= 0) return { min: 0, max: fallbackMax, step: 1 };
        const padded = Math.ceil(max * 1.15);
        return { min: 0, max: padded, step: padded <= 10 ? 1 : Math.ceil(padded / 5) };
    };

    const allZero = (arr) => !arr.length || arr.every((v) => !Number(v));

    const toggleChartEmpty = (id, show) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('d-none', !show);
    };

    const getBranchId = () => document.getElementById('globalBranchFilter')?.value || '';

    const getGlobalPeriod = () => ({
        from: document.getElementById('globalPeriodFrom')?.value || '',
        to: document.getElementById('globalPeriodTo')?.value || '',
    });

    const buildQs = (extra = {}) => {
        const qs = new URLSearchParams();
        const branchId = getBranchId();
        if (branchId) qs.set('branchId', branchId);
        if (extra.from) qs.set('from', extra.from);
        if (extra.to) qs.set('to', extra.to);
        return qs.toString();
    };

    const updateWelcome = () => {
        if (!window.MerchantI18n?.ready) return;
        const el = document.getElementById('dashboardWelcome');
        if (!el) return;
        const name = el.dataset.welcomeName || MerchantApi.t('common.merchant', 'Merchant');
        el.textContent = MerchantApi.tpl('dashboard.welcome', { name });
    };

    const setDefaultGlobalPeriod = () => {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 29);
        const fromEl = document.getElementById('globalPeriodFrom');
        const toEl = document.getElementById('globalPeriodTo');
        if (fromEl) fromEl.value = toYmd(from);
        if (toEl) toEl.value = toYmd(to);
    };

    const baseChartOptions = (yValues = [], money = false) => {
        const y = yAxisNice(yValues, money ? 1000 : 5);
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: fontFamily, size: 12 }, padding: 16, usePointStyle: true },
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    titleFont: { family: fontFamily },
                    bodyFont: { family: fontFamily },
                    padding: 12,
                    cornerRadius: 8,
                },
            },
            scales: {
                x: { ticks: { font: { family: fontFamily, size: 11 } }, grid: { display: false } },
                y: {
                    beginAtZero: true,
                    min: y.min,
                    max: y.max,
                    ticks: {
                        font: { family: fontFamily, size: 11 },
                        stepSize: y.step,
                        ...(money ? { callback: (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) } : {}),
                    },
                    grid: { color: 'rgba(148,163,184,0.12)' },
                },
            },
        };
    };

    const donutOptions = (cutout = '68%') => ({
        responsive: true,
        maintainAspectRatio: false,
        cutout,
        plugins: {
            legend: { display: true, position: 'bottom', labels: { font: { family: fontFamily }, usePointStyle: true } },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                callbacks: {
                    label: (ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = total ? Math.round((ctx.raw / total) * 100) : 0;
                        return `${ctx.label}: ${MerchantApi.formatMoney(ctx.raw)} (${pct}%)`;
                    },
                },
            },
        },
    });

    const populateBranchSelect = (branches = []) => {
        const select = document.getElementById('globalBranchFilter');
        if (!select || !branches.length) return;
        const saved = sessionStorage.getItem(BRANCH_KEY) || '';
        const current = select.value;
        const allLabel = MerchantApi.t('dashboard.allBranches', 'كل الفروع');
        select.innerHTML = `<option value="">${allLabel}</option>`;
        branches.forEach((b) => {
            const opt = document.createElement('option');
            opt.value = String(b.id);
            opt.textContent = b.name;
            select.appendChild(opt);
        });
        const restore = saved || current;
        if (restore && [...select.options].some((o) => o.value === restore)) {
            select.value = restore;
        }
    };

    const renderBranchCards = (rows = []) => {
        const grid = document.getElementById('branchesGrid');
        const badge = document.getElementById('branchCountBadge');
        if (!grid) return;

        if (badge) {
            badge.innerHTML = `${MerchantApi.formatNum(rows.length)} <span data-i18n="dashboard.branchUnit">${MerchantApi.t('dashboard.branchUnit', 'فرع')}</span>`;
        }

        if (!rows.length) {
            grid.innerHTML = `
                <div class="mpr-branches-empty" id="branchesEmptyState">
                    <div class="mpr-branches-empty-icon"><i class="fas fa-store-slash"></i></div>
                    <p>${MerchantApi.t('dashboard.noBranchesYet', 'لا توجد فروع بعد')}</p>
                    <a href="/merchant/ui/branches" class="mpr-btn-primary">${MerchantApi.t('branches.new', 'فرع جديد')}</a>
                </div>`;
            return;
        }

        grid.innerHTML = rows
            .map(
                (b) => `
            <article class="mpr-branch-card mpr-branch-card--link" data-branch-id="${b.id}" onclick="window.location.href='/merchant/ui/branches/${b.id}'" role="link" tabindex="0">
                <div class="mpr-branch-card-top">
                    <div class="mpr-branch-card-icon"><i class="fas fa-store"></i></div>
                    <div class="mpr-branch-card-info">
                        <h3 class="mpr-branch-card-name">${b.name}</h3>
                        ${b.address ? `<p class="mpr-branch-card-address">${b.address}</p>` : ''}
                    </div>
                </div>
                <div class="mpr-branch-card-metrics">
                    <div class="mpr-branch-metric">
                        <span>${MerchantApi.t('dashboard.colRevenue', 'المبيعات')}</span>
                        <strong>${MerchantApi.formatMoney(b.revenue)}</strong>
                    </div>
                    <div class="mpr-branch-metric">
                        <span>${MerchantApi.t('dashboard.colProfit', 'الربح')}</span>
                        <strong>${MerchantApi.formatMoney(b.profit)}</strong>
                    </div>
                    <div class="mpr-branch-metric">
                        <span>${MerchantApi.t('dashboard.colInvoices', 'الفواتير')}</span>
                        <strong>${MerchantApi.formatNum(b.invoices)}</strong>
                    </div>
                </div>
            </article>`
            )
            .join('');
    };

    const loadBranches = async () => {
        const res = await MerchantApi.request('/branch/branches');
        if (MerchantApi.isSuccess(res) && Array.isArray(res.data)) {
            populateBranchSelect(res.data.map((b) => ({ id: b.id, name: b.name })));
            return;
        }
        populateBranchSelect([]);
    };

    const loadProfile = async () => {
        const res = await MerchantApi.request('/company/profile');
        if (!MerchantApi.isSuccess(res) || !res.data) return;
        const d = res.data;

        document.getElementById('statPlan').textContent = d.subscription?.plan?.name || '—';
        document.getElementById('statExpires').textContent =
            MerchantApi.formatDate(d.subscription?.expiresAt) || MerchantApi.lifetimeLabel();
        document.getElementById('statBranchLimit').textContent = `${d.stats?.branchCount || 0} / ${d.stats?.maxBranches || '—'}`;

        const banner = document.getElementById('subscriptionBanner');
        const expiresAt = d.subscription?.expiresAt ? new Date(d.subscription.expiresAt) : null;
        if (banner) {
            banner.classList.add('d-none');
            if (expiresAt && !Number.isNaN(expiresAt.getTime())) {
                const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
                if (daysLeft > 0 && daysLeft <= 7) {
                    banner.classList.remove('d-none');
                    const title = document.getElementById('subscriptionBannerTitle');
                    const text = document.getElementById('subscriptionBannerText');
                    if (title) title.textContent = MerchantApi.tpl('dashboard.subExpiringTitleDays', { days: daysLeft });
                    if (text) text.textContent = MerchantApi.t('dashboard.subExpiringText');
                } else if (daysLeft <= 0 && daysLeft > -7) {
                    const graceBanner = document.getElementById('subscriptionGraceBanner');
                    const graceText = document.getElementById('subscriptionGraceText');
                    if (graceBanner) {
                        graceBanner.classList.remove('d-none');
                        if (graceText) {
                            graceText.textContent = MerchantApi.tpl('dashboard.graceText', {
                                days: Math.abs(daysLeft) + 1,
                            });
                        }
                    }
                } else if (daysLeft <= 0) {
                    banner.classList.remove('d-none');
                    banner.classList.add('mpr-sub-banner--danger');
                    const title = document.getElementById('subscriptionBannerTitle');
                    const text = document.getElementById('subscriptionBannerText');
                    if (title) title.textContent = MerchantApi.t('dashboard.subExpiredTitle');
                    if (text) text.textContent = MerchantApi.t('dashboard.subExpiredText');
                }
            }
        }
    };

    const setPanelLoading = (on) => {
        document.getElementById('metricsPanel')?.classList.toggle('mpr-is-loading', on);
    };

    const loadLowStock = async () => {
        const branchId = getBranchId();
        const qs = branchId ? `?branchId=${branchId}` : '';
        const res = await MerchantApi.request(`/stats/low-stock${qs}`);
        const banner = document.getElementById('lowStockBanner');
        const text = document.getElementById('lowStockBannerText');
        if (!banner || !MerchantApi.isSuccess(res)) return;
        const items = res.data || [];
        if (!items.length) {
            banner.classList.add('d-none');
            return;
        }
        banner.classList.remove('d-none');
        if (text) {
            const names = items.slice(0, 3).map((p) => p.name).join('، ');
            text.textContent = MerchantApi.tpl('dashboard.lowStockBanner', {
                count: MerchantApi.formatNum(items.length),
                names,
            });
        }
    };

    const exportBranchesSummary = async () => {
        const period = getGlobalPeriod();
        const qs = new URLSearchParams();
        if (period.from) qs.set('from', period.from);
        if (period.to) qs.set('to', period.to);
        const url = `/merchant/stats/branches/summary/export?${qs.toString()}`;
        try {
            const res = await fetch(url, { credentials: 'include', headers: { lang: MerchantApi.getLang() } });
            if (!res.ok) throw new Error('export failed');
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = MerchantApi.getLang() === 'en' ? 'branches-summary.xlsx' : 'ملخص-الفروع.xlsx';
            a.click();
            URL.revokeObjectURL(a.href);
            MerchantApi.toast(MerchantApi.t('dashboard.exportSuccess'), 'success');
        } catch {
            MerchantApi.toast(MerchantApi.t('common.loadFailed'), 'danger');
        }
    };

    const loadOverview = async () => {
        const period = getGlobalPeriod();
        const qs = buildQs(period);
        const res = await MerchantApi.request(`/stats/overview?${qs}`);
        if (!MerchantApi.isSuccess(res) || !res.data) {
            MerchantApi.toast(MerchantApi.t('common.loadFailed'), 'warning');
            return;
        }
        const d = res.data;

        if (Array.isArray(d.branches) && d.branches.length) {
            populateBranchSelect(d.branches);
        }

        document.getElementById('kpiRevenueToday').textContent = MerchantApi.formatMoney(d.revenueToday);
        document.getElementById('kpiInvoicesToday').textContent = MerchantApi.tpl('dashboard.invoicesCount', {
            count: MerchantApi.formatNum(d.invoicesToday),
        });
        document.getElementById('kpiRevenuePeriod').textContent = MerchantApi.formatMoney(d.revenuePeriod);
        document.getElementById('kpiInvoicesPeriod').textContent = MerchantApi.tpl('dashboard.invoicesCount', {
            count: MerchantApi.formatNum(d.invoicesPeriod),
        });
        document.getElementById('kpiProfitPeriod').textContent = MerchantApi.formatMoney(d.profitPeriod);
        document.getElementById('kpiBranchesCashiers').textContent = `${MerchantApi.formatNum(d.branchCount)} / ${MerchantApi.formatNum(d.cashierCount)}`;
        document.getElementById('kpiProducts').textContent = MerchantApi.tpl('dashboard.productsCount', {
            count: MerchantApi.formatNum(d.productCount),
        });
        document.getElementById('statRevenueMonth').textContent = MerchantApi.formatMoney(d.revenueMonth);
    };

    const setFilterRange = (filterEl, { days, months }) => {
        const to = new Date();
        const from = new Date();
        if (months) from.setMonth(from.getMonth() - (months - 1), 1);
        else from.setDate(from.getDate() - ((days || 7) - 1));
        const fromInput = filterEl.querySelector('.pos-chart-from');
        const toInput = filterEl.querySelector('.pos-chart-to');
        if (fromInput) fromInput.value = toYmd(from);
        if (toInput) toInput.value = toYmd(to);
    };

    const getFilterParams = (filterEl) => {
        const from = filterEl?.querySelector('.pos-chart-from')?.value;
        const to = filterEl?.querySelector('.pos-chart-to')?.value;
        const qs = new URLSearchParams();
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);
        if (!filterEl?.dataset.ignoreBranch) {
            const branchId = getBranchId();
            if (branchId) qs.set('branchId', branchId);
        }
        return qs.toString();
    };

    const fetchChart = async (type, filterEl) => {
        const qs = getFilterParams(filterEl);
        const res = await MerchantApi.request(`/stats/chart/${type}${qs ? `?${qs}` : ''}`);
        if (!MerchantApi.isSuccess(res)) return null;
        return res.data;
    };

    const chartReady = () => typeof window.Chart !== 'undefined';

    const renderDailySalesChart = (dailySales) => {
        if (!chartReady()) return;
        const counts = dailySales.map((x) => x.sales);
        const revenue = dailySales.map((x) => x.revenue);
        toggleChartEmpty('dailySalesEmpty', allZero(counts) && allZero(revenue));

        const sumEl = document.getElementById('dailySalesSummary');
        if (sumEl) {
            const totalInv = counts.reduce((a, b) => a + b, 0);
            const totalRev = revenue.reduce((a, b) => a + b, 0);
            sumEl.innerHTML = `<span>${MerchantApi.formatNum(totalInv)} ${MerchantApi.t('dashboard.chartInvoices')}</span><span>${MerchantApi.formatMoney(totalRev)}</span>`;
        }

        const revAxis = yAxisNice(revenue, 1000);
        const countAxis = yAxisNice(counts, 5);

        if (charts.daily) charts.daily.destroy();
        charts.daily = new Chart(document.getElementById('chartDailySales'), {
            type: 'bar',
            data: {
                labels: dailySales.map((x) => x.label),
                datasets: [
                    {
                        type: 'bar',
                        label: MerchantApi.t('dashboard.chartRevenue'),
                        data: revenue,
                        backgroundColor: chartColors.primaryFill,
                        borderColor: chartColors.primary,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        yAxisID: 'y',
                        order: 2,
                    },
                    {
                        type: 'line',
                        label: MerchantApi.t('dashboard.chartInvoices'),
                        data: counts,
                        borderColor: chartColors.amber,
                        backgroundColor: 'transparent',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        tension: 0.35,
                        yAxisID: 'y1',
                        order: 1,
                    },
                ],
            },
            options: {
                ...baseChartOptions(revenue, true),
                scales: {
                    x: { ticks: { font: { family: fontFamily, size: 11 } }, grid: { display: false } },
                    y: {
                        position: 'left',
                        beginAtZero: true,
                        min: revAxis.min,
                        max: revAxis.max,
                        ticks: {
                            stepSize: revAxis.step,
                            callback: (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
                        },
                        grid: { color: 'rgba(148,163,184,0.12)' },
                    },
                    y1: {
                        position: 'right',
                        beginAtZero: true,
                        min: countAxis.min,
                        max: countAxis.max,
                        grid: { drawOnChartArea: false },
                        ticks: { stepSize: countAxis.step },
                    },
                },
            },
        });
    };

    const renderProfitChart = (rows) => {
        if (!chartReady()) return;
        const profits = rows.map((x) => x.profit);
        const revenues = rows.map((x) => x.revenue);
        toggleChartEmpty('profitEmpty', allZero(profits) && allZero(revenues));

        const sumEl = document.getElementById('profitSummary');
        if (sumEl) {
            const totalProfit = profits.reduce((a, b) => a + b, 0);
            sumEl.textContent = MerchantApi.formatMoney(totalProfit);
        }

        if (charts.profit) charts.profit.destroy();
        charts.profit = new Chart(document.getElementById('chartProfit'), {
            type: 'line',
            data: {
                labels: rows.map((x) => x.label),
                datasets: [
                    {
                        label: MerchantApi.t('dashboard.chartProfit'),
                        data: profits,
                        borderColor: chartColors.success,
                        backgroundColor: 'rgba(34, 197, 94, 0.12)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2.5,
                    },
                    {
                        label: MerchantApi.t('dashboard.chartRevenue'),
                        data: revenues,
                        borderColor: chartColors.primary,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.35,
                    },
                ],
            },
            options: baseChartOptions([...profits, ...revenues], true),
        });
    };

    const renderSalesByBranchChart = (rows) => {
        if (!chartReady()) return;
        if (charts.salesBranch) charts.salesBranch.destroy();
        charts.salesBranch = new Chart(document.getElementById('chartSalesByBranch'), {
            type: 'doughnut',
            data: {
                labels: rows.map((x) => x.label),
                datasets: [{
                    data: rows.map((x) => x.revenue),
                    backgroundColor: branchColors,
                    borderWidth: 0,
                    hoverOffset: 6,
                }],
            },
            options: donutOptions('65%'),
        });
    };

    const renderInvoicesByBranchChart = (rows) => {
        if (!chartReady()) return;
        if (charts.invBranch) charts.invBranch.destroy();
        charts.invBranch = new Chart(document.getElementById('chartInvoicesByBranch'), {
            type: 'bar',
            data: {
                labels: rows.map((x) => x.label),
                datasets: [{
                    label: MerchantApi.t('dashboard.chartInvoices'),
                    data: rows.map((x) => x.count),
                    backgroundColor: chartColors.cyan,
                    borderRadius: 8,
                    maxBarThickness: 40,
                }],
            },
            options: { ...baseChartOptions(rows.map((x) => x.count)), plugins: { legend: { display: false } } },
        });
    };

    const renderTopProductsChart = (rows) => {
        if (!chartReady()) return;
        if (charts.topProducts) charts.topProducts.destroy();
        charts.topProducts = new Chart(document.getElementById('chartTopProducts'), {
            type: 'bar',
            data: {
                labels: rows.map((x) => x.label),
                datasets: [{
                    label: MerchantApi.t('dashboard.chartQty'),
                    data: rows.map((x) => x.qty),
                    backgroundColor: chartColors.success,
                    borderRadius: 8,
                    maxBarThickness: 36,
                }],
            },
            options: { ...baseChartOptions(rows.map((x) => x.qty)), indexAxis: 'y', plugins: { legend: { display: false } } },
        });
    };

    const renderTopCustomersChart = (rows) => {
        if (!chartReady()) return;
        if (charts.topCustomers) charts.topCustomers.destroy();
        charts.topCustomers = new Chart(document.getElementById('chartTopCustomers'), {
            type: 'bar',
            data: {
                labels: rows.map((x) => x.label),
                datasets: [{
                    label: MerchantApi.t('dashboard.chartRevenue'),
                    data: rows.map((x) => x.revenue),
                    backgroundColor: chartColors.primary,
                    borderRadius: 8,
                    maxBarThickness: 36,
                }],
            },
            options: { ...baseChartOptions(rows.map((x) => x.revenue), true), indexAxis: 'y', plugins: { legend: { display: false } } },
        });
    };

    const loadChart = async (type, filterEl) => {
        const result = await fetchChart(type, filterEl);
        if (!result) return;
        switch (type) {
            case 'daily-sales':
                renderDailySalesChart(result.data);
                break;
            case 'profit':
                renderProfitChart(result.data);
                break;
            case 'sales-by-branch':
                renderSalesByBranchChart(result.data);
                break;
            case 'invoices-by-branch':
                renderInvoicesByBranchChart(result.data);
                break;
            case 'top-products':
                renderTopProductsChart(result.data);
                break;
            case 'top-customers':
                renderTopCustomersChart(result.data);
                break;
            default:
                break;
        }
    };

    const loadAllCharts = async () => {
        const filters = document.querySelectorAll('.pos-chart-filter');
        await Promise.all([...filters].map((el) => loadChart(el.dataset.chartType, el)));
    };

    const loadBranchesTable = async () => {
        const period = getGlobalPeriod();
        const qs = new URLSearchParams();
        if (period.from) qs.set('from', period.from);
        if (period.to) qs.set('to', period.to);
        const res = await MerchantApi.request(`/stats/branches/summary?${qs.toString()}`);
        const tbody = document.querySelector('#branchesSummaryTable tbody');
        if (!tbody) return;

        if (!MerchantApi.isSuccess(res)) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${MerchantApi.t('common.loadFailed')}</td></tr>`;
            return;
        }
        if (!res.data?.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${MerchantApi.t('common.noData')}</td></tr>`;
            renderBranchCards([]);
            return;
        }

        renderBranchCards(res.data);

        tbody.innerHTML = res.data
            .map(
                (b) => `
            <tr>
                <td><a href="/merchant/ui/branches/${b.id}" class="mpr-table-link"><strong>${b.name}</strong></a>${b.address ? `<br><small class="text-muted">${b.address}</small>` : ''}</td>
                <td><span class="pos-table-metric">${MerchantApi.formatMoney(b.revenue)}</span></td>
                <td><span class="pos-table-metric">${MerchantApi.formatMoney(b.profit)}</span></td>
                <td><span class="pos-table-metric">${MerchantApi.formatNum(b.invoices)}</span></td>
                <td>${MerchantApi.formatNum(b.cashierCount)}</td>
                <td>${MerchantApi.statusBadge(b.status)}</td>
            </tr>`
            )
            .join('');
    };

    const initChartFilters = () => {
        document.querySelectorAll('.pos-chart-filter').forEach((filterEl) => {
            const activePreset = filterEl.querySelector('.pos-chart-preset.active');
            if (activePreset) {
                setFilterRange(filterEl, {
                    days: Number(activePreset.dataset.days) || null,
                    months: Number(activePreset.dataset.months) || null,
                });
            }
            if (filtersInitialized) return;

            filterEl.querySelectorAll('.pos-chart-preset').forEach((btn) => {
                btn.addEventListener('click', () => {
                    filterEl.querySelectorAll('.pos-chart-preset').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                    setFilterRange(filterEl, {
                        days: Number(btn.dataset.days) || null,
                        months: Number(btn.dataset.months) || null,
                    });
                    loadChart(filterEl.dataset.chartType, filterEl);
                });
            });
            filterEl.querySelector('.pos-chart-apply')?.addEventListener('click', () => {
                filterEl.querySelectorAll('.pos-chart-preset').forEach((b) => b.classList.remove('active'));
                loadChart(filterEl.dataset.chartType, filterEl);
            });
        });
        filtersInitialized = true;
    };

    const reloadDashboard = async () => {
        updateWelcome();
        setPanelLoading(true);
        try {
            await loadOverview();
            await Promise.allSettled([loadAllCharts(), loadBranchesTable(), loadLowStock()]);
        } finally {
            setPanelLoading(false);
        }
    };

    const loadAll = async () => {
        try {
            await loadBranches();
            initChartFilters();
            await loadProfile();
            await reloadDashboard();
        } catch (err) {
            console.error('merchant dashboard load error:', err);
            MerchantApi.toast(MerchantApi.t('common.loadFailed'), 'danger');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        setDefaultGlobalPeriod();

        void (async () => {
            try {
                await window.MerchantI18n?.init?.();
            } catch (err) {
                console.warn('merchant i18n init:', err);
            }
            await loadAll();
        })();

        document.getElementById('refreshDashboard')?.addEventListener('click', reloadDashboard);
        document.getElementById('exportBranchesSummary')?.addEventListener('click', exportBranchesSummary);
        document.getElementById('applyGlobalPeriod')?.addEventListener('click', reloadDashboard);
        document.getElementById('globalBranchFilter')?.addEventListener('change', (e) => {
            sessionStorage.setItem(BRANCH_KEY, e.target.value);
            reloadDashboard();
        });
    });

    window.onMerchantLangChange = () => {
        MerchantI18n.apply();
        updateWelcome();
        reloadDashboard();
    };
})();
