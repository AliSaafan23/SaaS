(function () {
    const charts = {};
    let lastOverview = null;

    const chartColors = {
        primary: 'rgba(0, 82, 204, 0.9)',
        primaryFill: 'rgba(0, 82, 204, 0.12)',
        success: 'rgba(34, 197, 94, 0.85)',
        successFill: 'rgba(34, 197, 94, 0.15)',
        cyan: 'rgba(0, 184, 217, 0.85)',
        violet: 'rgba(139, 92, 246, 0.85)',
        gray: 'rgba(148, 163, 184, 0.55)',
        amber: 'rgba(245, 158, 11, 0.85)',
    };

    const usageColors = [chartColors.cyan, chartColors.violet, chartColors.amber];

    const fontFamily = 'Cairo, sans-serif';

    const yAxisNice = (values, fallbackMax = 5) => {
        const max = Math.max(...values.map(Number), 0);
        if (max <= 0) return { min: 0, max: fallbackMax, step: 1 };
        const padded = Math.ceil(max * 1.15);
        return { min: 0, max: padded, step: padded <= 10 ? 1 : Math.ceil(padded / 5) };
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
                x: {
                    ticks: { font: { family: fontFamily, size: 11 }, maxRotation: 0 },
                    grid: { display: false },
                },
                y: {
                    beginAtZero: true,
                    min: y.min,
                    max: y.max,
                    ticks: {
                        font: { family: fontFamily, size: 11 },
                        stepSize: y.step,
                        ...(money
                            ? { callback: (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) }
                            : {}),
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
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                callbacks: {
                    label: (ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = total ? Math.round((ctx.raw / total) * 100) : 0;
                        return `${ctx.label}: ${PosApi.formatNum(ctx.raw)} (${pct}%)`;
                    },
                },
            },
        },
    });

    const platformChartLabel = (key) => {
        const map = {
            desktop: PosApi.platformLabel('desktop'),
            mobile: PosApi.platformLabel('mobile'),
            awaitingPayment: PosApi.t('dashboard.platformAwaitingPayment'),
        };
        return map[key] || key;
    };

    const usageChartLabel = (key) => {
        const map = {
            branches: PosApi.t('dashboard.usageBranches'),
            cashiers: PosApi.t('dashboard.usageCashiers'),
            devices: PosApi.t('dashboard.usageDevices'),
        };
        return map[key] || key;
    };

    const statusLabel = (status) => PosApi.t(`status.${status}`, status);

    const allZero = (arr) => !arr.length || arr.every((v) => !Number(v));

    const toggleChartEmpty = (id, show) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('d-none', !show);
    };

    const updateWelcome = () => {
        if (!window.AdminI18n?.ready) return;
        const el = document.getElementById('dashboardWelcome') || document.querySelector('.pos-dashboard-welcome h2');
        if (!el) return;
        const name =
            el.dataset.welcomeName ||
            document.querySelector('.pos-user-profile strong')?.textContent?.trim() ||
            PosApi.t('common.admin', 'Admin');
        el.textContent = PosApi.tpl('dashboard.welcome', { name });
    };

    const renderUsagePanel = (d) => {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        set('usageBranches', PosApi.formatNum(d.totalBranches));
        set('usageCashiers', PosApi.formatNum(d.totalCashiers));
        set('usageDevices', PosApi.formatNum(d.totalActiveDevices));
        set('usageDesktopDevices', PosApi.formatNum(d.desktopDevices));
        set('usageMobileDevices', PosApi.formatNum(d.mobileDevices));
        set('usageActiveCashiers', PosApi.formatNum(d.activeCashiers));
        set('usageAvgDevices', PosApi.formatNum(d.avgDevicesPerCashier));
    };

    const toYmd = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const setFilterRange = (filterEl, { days, months }) => {
        const to = new Date();
        const from = new Date();
        if (months) {
            from.setMonth(from.getMonth() - (months - 1), 1);
        } else {
            from.setDate(from.getDate() - ((days || 7) - 1));
        }
        const fromInput = filterEl.querySelector('.pos-chart-from');
        const toInput = filterEl.querySelector('.pos-chart-to');
        if (fromInput) fromInput.value = toYmd(from);
        if (toInput) toInput.value = toYmd(to);
    };

    let filtersInitialized = false;

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

    const getFilterParams = (filterEl) => {
        const from = filterEl?.querySelector('.pos-chart-from')?.value;
        const to = filterEl?.querySelector('.pos-chart-to')?.value;
        const qs = new URLSearchParams();
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);
        return qs.toString();
    };

    const fetchChart = async (type, filterEl) => {
        const qs = getFilterParams(filterEl);
        const url = `/stats/chart/${type}${qs ? `?${qs}` : ''}`;
        const res = await PosApi.request(url);
        if (res.key !== 'success') return null;
        return res.data;
    };

    const loadChart = async (type, filterEl) => {
        const result = await fetchChart(type, filterEl);
        if (!result) return;
        const data = result.data;

        switch (type) {
            case 'daily-sales':
                renderDailySalesChart(data);
                break;
            case 'subscription-revenue':
                renderSubRevenueChart(data);
                break;
            case 'platform-usage':
                renderUsageChart(data);
                break;
            case 'tenant-sales':
                renderTenantSalesChart(data);
                break;
            case 'subscriptions-by-plan':
                renderSubsByPlanChart(data);
                break;
            case 'subscriptions-by-platform':
                renderSubsByPlatformChart(data);
                break;
            default:
                break;
        }
    };

    const loadAllCharts = async () => {
        const filters = document.querySelectorAll('.pos-chart-filter');
        await Promise.all([...filters].map((el) => loadChart(el.dataset.chartType, el)));

        const bundleRes = await PosApi.request('/stats/charts');
        if (bundleRes.key === 'success') {
            renderTopCompanies(bundleRes.data.topCompanies || []);
        }
    };

    const renderUsageLegend = (usageDistribution) => {
        const host = document.getElementById('usageChartLegend');
        if (!host) return;
        const total = usageDistribution.reduce((s, x) => s + x.count, 0);
        host.innerHTML = usageDistribution
            .map((item, i) => {
                const pct = total ? Math.round((item.count / total) * 100) : 0;
                const label = usageChartLabel(item.label);
                return `
                <div class="pos-usage-legend-item">
                    <span class="pos-usage-legend-dot" style="background:${usageColors[i]}"></span>
                    <div class="pos-usage-legend-text">
                        <strong>${PosApi.formatNum(item.count)}</strong>
                        <span>${label}</span>
                        <small>${pct}%</small>
                    </div>
                </div>`;
            })
            .join('');
    };

    const loadOverview = async () => {
        const res = await PosApi.request('/stats/overview');
        if (res.key !== 'success') return;
        const d = res.data;
        lastOverview = d;

        document.getElementById('statTotalSubscribers').textContent = PosApi.formatNum(d.totalSubscribers);
        document.getElementById('statAwaitingPayment').textContent = PosApi.formatNum(d.awaitingPayment);
        document.getElementById('statPendingPayments').textContent = PosApi.formatNum(d.pendingPayments);
        document.getElementById('statSubscriptionMrr').textContent = PosApi.formatMoney(d.subscriptionMrr);
        document.getElementById('statMrrBreakdown').textContent = `${PosApi.platformLabel('desktop')}: ${PosApi.formatMoney(d.subscriptionMrrDesktop)} · ${PosApi.platformLabel('mobile')}: ${PosApi.formatMoney(d.subscriptionMrrMobile)}`;
        document.getElementById('statSubRevenueMonth').textContent = PosApi.formatMoney(d.subscriptionRevenueMonth);
        document.getElementById('statSubRevenueToday').innerHTML = `<i class="fas fa-arrow-up"></i> ${PosApi.tpl('dashboard.kpiSubRevenueToday', { amount: PosApi.formatMoney(d.subscriptionRevenueToday) })}`;
        document.getElementById('statActiveSubs').textContent = PosApi.formatNum(d.activeSubscriptions);
        document.getElementById('statSalesToday').textContent = PosApi.formatNum(d.totalSalesToday);
        document.getElementById('statSalesMonth').textContent = PosApi.tpl('dashboard.kpiMonth', {
            count: PosApi.formatNum(d.totalSalesMonth),
        });
        const revToday = document.getElementById('statSalesRevenueToday');
        if (revToday) {
            revToday.textContent = PosApi.tpl('dashboard.salesTodayAmount', {
                amount: PosApi.formatMoney(d.totalRevenueToday),
            });
        }
        document.getElementById('statExpiredSubs').textContent = PosApi.formatNum(d.expiredSubscriptions);
        document.getElementById('statSubRevenueAllTime').textContent = PosApi.formatMoney(d.subscriptionRevenueAllTime);

        renderUsagePanel(d);
    };

    const renderDailySalesChart = (dailySales) => {
        const dailyCounts = dailySales.map((x) => x.sales);
        const dailyRevenue = dailySales.map((x) => x.revenue);
        toggleChartEmpty('dailySalesEmpty', allZero(dailyCounts) && allZero(dailyRevenue));

        const dailySumEl = document.getElementById('dailySalesSummary');
        if (dailySumEl) {
            const totalInv = dailyCounts.reduce((a, b) => a + b, 0);
            const totalRev = dailyRevenue.reduce((a, b) => a + b, 0);
            dailySumEl.innerHTML = `<span>${PosApi.formatNum(totalInv)} ${PosApi.t('dashboard.chartLabelTransactions')}</span><span>${PosApi.formatMoney(totalRev)}</span>`;
        }

        const revAxis = yAxisNice(dailyRevenue, 1000);
        const countAxis = yAxisNice(dailyCounts, 5);

        if (charts.daily) charts.daily.destroy();
        charts.daily = new Chart(document.getElementById('chartDailySales'), {
            type: 'bar',
            data: {
                labels: dailySales.map((x) => x.label),
                datasets: [
                    {
                        type: 'bar',
                        label: PosApi.t('dashboard.chartLabelRevenueShort'),
                        data: dailyRevenue,
                        backgroundColor: chartColors.primaryFill,
                        borderColor: chartColors.primary,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        yAxisID: 'y',
                        order: 2,
                    },
                    {
                        type: 'line',
                        label: PosApi.t('dashboard.chartLabelTransactions'),
                        data: dailyCounts,
                        borderColor: chartColors.amber,
                        backgroundColor: 'transparent',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointBackgroundColor: chartColors.amber,
                        tension: 0.35,
                        yAxisID: 'y1',
                        order: 1,
                    },
                ],
            },
            options: {
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
                        position: 'left',
                        beginAtZero: true,
                        min: revAxis.min,
                        max: revAxis.max,
                        ticks: {
                            font: { family: fontFamily, size: 11 },
                            stepSize: revAxis.step,
                            callback: (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
                        },
                        grid: { color: 'rgba(148,163,184,0.12)' },
                        title: { display: true, text: PosApi.t('dashboard.chartLabelRevenueShort'), font: { family: fontFamily, size: 10 } },
                    },
                    y1: {
                        position: 'right',
                        beginAtZero: true,
                        min: countAxis.min,
                        max: countAxis.max,
                        grid: { drawOnChartArea: false },
                        ticks: { stepSize: countAxis.step, font: { family: fontFamily, size: 11 } },
                        title: { display: true, text: PosApi.t('dashboard.chartLabelTransactions'), font: { family: fontFamily, size: 10 } },
                    },
                },
            },
        });
    };

    const renderSubRevenueChart = (monthlySubscriptionRevenue) => {
        const subRevTotal = monthlySubscriptionRevenue.reduce((s, x) => s + x.revenue, 0);
        const subRevEl = document.getElementById('subRevenueSummary');
        if (subRevEl) subRevEl.textContent = PosApi.formatMoney(subRevTotal);

        if (charts.subRev) charts.subRev.destroy();
        charts.subRev = new Chart(document.getElementById('chartSubscriptionRevenue'), {
            type: 'bar',
            data: {
                labels: monthlySubscriptionRevenue.map((x) => x.label),
                datasets: [{
                    label: PosApi.t('dashboard.chartSubRevenue'),
                    data: monthlySubscriptionRevenue.map((x) => x.revenue),
                    backgroundColor: chartColors.success,
                    borderRadius: 8,
                    maxBarThickness: 48,
                }],
            },
            options: baseChartOptions(monthlySubscriptionRevenue.map((x) => x.revenue), true),
        });
    };

    const renderUsageChart = (usageDistribution) => {
        renderUsageLegend(usageDistribution || []);
        const usageTotal = (usageDistribution || []).reduce((s, x) => s + x.count, 0);

        if (charts.usage) charts.usage.destroy();
        const usageCanvas = document.getElementById('chartPlatformUsage');
        if (usageCanvas?.parentElement) {
            let center = usageCanvas.parentElement.querySelector('.pos-donut-center');
            if (!center) {
                center = document.createElement('div');
                center.className = 'pos-donut-center';
                usageCanvas.parentElement.appendChild(center);
            }
            center.innerHTML = `<span class="pos-donut-center-value">${PosApi.formatNum(usageTotal)}</span><span class="pos-donut-center-label">${PosApi.t('dashboard.usageTotalEntities')}</span>`;
        }

        charts.usage = new Chart(usageCanvas, {
            type: 'doughnut',
            data: {
                labels: (usageDistribution || []).map((x) => usageChartLabel(x.label)),
                datasets: [{
                    data: (usageDistribution || []).map((x) => x.count),
                    backgroundColor: usageColors,
                    borderWidth: 0,
                    hoverOffset: 6,
                }],
            },
            options: donutOptions('72%'),
        });
    };

    const renderTenantSalesChart = (monthlyRevenue) => {
        toggleChartEmpty('tenantSalesEmpty', allZero(monthlyRevenue.map((x) => x.revenue)));
        const tenantSumEl = document.getElementById('tenantSalesSummary');
        if (tenantSumEl) {
            const total = monthlyRevenue.reduce((s, x) => s + x.revenue, 0);
            tenantSumEl.textContent = PosApi.formatMoney(total);
        }

        if (charts.monthly) charts.monthly.destroy();
        charts.monthly = new Chart(document.getElementById('chartMonthlyRevenue'), {
            type: 'bar',
            data: {
                labels: monthlyRevenue.map((x) => x.label),
                datasets: [{
                    label: PosApi.t('dashboard.chartTenantSales'),
                    data: monthlyRevenue.map((x) => x.revenue),
                    backgroundColor: chartColors.primary,
                    borderRadius: 8,
                    maxBarThickness: 48,
                }],
            },
            options: baseChartOptions(monthlyRevenue.map((x) => x.revenue), true),
        });
    };

    const renderSubsByPlanChart = (subscriptionGrowth) => {
        if (charts.subs) charts.subs.destroy();
        charts.subs = new Chart(document.getElementById('chartSubscriptionGrowth'), {
            type: 'doughnut',
            data: {
                labels: subscriptionGrowth.map((x) => x.label),
                datasets: [{
                    data: subscriptionGrowth.map((x) => x.count),
                    backgroundColor: [chartColors.primary, chartColors.success, chartColors.cyan, chartColors.gray],
                    borderWidth: 0,
                    hoverOffset: 6,
                }],
            },
            options: { ...donutOptions('65%'), plugins: { ...donutOptions().plugins, legend: { display: true, position: 'bottom', labels: { font: { family: fontFamily }, usePointStyle: true } } } },
        });
    };

    const renderSubsByPlatformChart = (subscriptionsByPlatform) => {
        if (charts.platform) charts.platform.destroy();
        charts.platform = new Chart(document.getElementById('chartSubscriptionsByPlatform'), {
            type: 'bar',
            data: {
                labels: subscriptionsByPlatform.map((x) => platformChartLabel(x.label)),
                datasets: [{
                    label: PosApi.t('dashboard.chartLabelCount'),
                    data: subscriptionsByPlatform.map((x) => x.count),
                    backgroundColor: [chartColors.cyan, chartColors.violet, chartColors.amber],
                    borderRadius: 8,
                    maxBarThickness: 36,
                }],
            },
            options: { ...baseChartOptions(subscriptionsByPlatform.map((x) => x.count)), indexAxis: 'y', plugins: { legend: { display: false } } },
        });
    };

    const renderTopCompanies = (rows) => {
        const tbody = document.querySelector('#topCompaniesTable tbody');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">${PosApi.t('dashboard.noData')}</td></tr>`;
            return;
        }
        tbody.innerHTML = rows
            .map(
                (c) => `
            <tr>
                <td><strong>${c.name}</strong><br><small class="text-muted">${c.phone || PosApi.t('common.emDash')}</small></td>
                <td><span class="pos-table-metric">${PosApi.formatNum(c.branchCount)}</span></td>
                <td><span class="pos-table-metric">${PosApi.formatNum(c.cashierCount)}</span></td>
                <td><span class="pos-table-metric pos-table-metric--devices">${PosApi.formatNum(c.activeDeviceCount)}</span></td>
                <td>${PosApi.formatMoney(c.mrr)}</td>
                <td>${PosApi.formatMoney(c.salesMonth)}</td>
                <td>${statusLabel(c.status)}</td>
            </tr>`
            )
            .join('');
    };

    const noDataRow = (cols) =>
        `<tr><td colspan="${cols}" class="text-center text-muted">${PosApi.t('dashboard.noData')}</td></tr>`;

    const loadActivities = async () => {
        const res = await PosApi.request('/stats/activities');
        if (res.key !== 'success') return;
        const d = res.data;

        document.querySelector('#activitySubscribersTable tbody').innerHTML = (d.newSubscribers || [])
            .map(
                (c) =>
                    `<tr><td>${c.id}</td><td>${c.name}<br><small class="text-muted">${c.phone || PosApi.t('common.emDash')}</small></td><td>${statusLabel(c.status)}</td><td>${PosApi.formatDate(c.createdAt)}</td></tr>`
            )
            .join('') || noDataRow(4);

        document.querySelector('#activityPaymentsTable tbody').innerHTML = (d.recentPayments || [])
            .map(
                (p) =>
                    `<tr><td>${p.id}</td><td>${PosApi.formatMoney(p.amount)}<br><small class="text-muted">${p.company?.name || ''}</small></td><td>${PosApi.platformLabel(p.platform)}</td><td>${PosApi.formatDate(p.paidAt || p.createdAt)}</td></tr>`
            )
            .join('') || noDataRow(4);

        document.querySelector('#activitySalesTable tbody').innerHTML = (d.recentSales || [])
            .map(
                (s) =>
                    `<tr><td>${s.id}</td><td>${PosApi.formatMoney(s.total)}<br><small class="text-muted">${s.branch?.company?.name || ''}</small></td><td>${PosApi.formatDate(s.createdAt)}</td></tr>`
            )
            .join('') || noDataRow(3);

        document.querySelector('#activityAuditTable tbody').innerHTML = (d.loginActivities || [])
            .map(
                (l) =>
                    `<tr><td>${l.userName || PosApi.t('common.emDash')}</td><td>${l.action}</td><td>${l.module}</td><td>${PosApi.formatDate(l.createdAt)}</td></tr>`
            )
            .join('') || noDataRow(4);
    };

    const loadAll = async () => {
        updateWelcome();
        initChartFilters();
        await Promise.all([loadOverview(), loadAllCharts(), loadActivities()]);
    };

    document.addEventListener('DOMContentLoaded', async () => {
        await window.AdminI18n?.init?.();
        await loadAll();
        document.getElementById('refreshDashboard')?.addEventListener('click', loadAll);
    });

    window.onAdminLangChange = () => {
        loadAll();
    };
})();
