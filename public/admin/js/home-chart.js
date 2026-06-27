/* Home dashboard — revenue + billing vs collection charts */
const HomeChart = {
    chart: null,
    trendChart: null,
    granularity: 'monthly',
    canvasId: 'revenueChart',
    trendCanvasId: 'homeTrendChart',

    init({ canvasId, trendCanvasId, initial, trend }) {
        this.canvasId = canvasId || 'revenueChart';
        this.trendCanvasId = trendCanvasId || 'homeTrendChart';
        this.granularity = initial?.granularity || 'monthly';
        this.renderRevenue(initial?.labels || [], initial?.data || []);
        this.renderTrend(trend);
        this.updateMeta(initial);
        this.bindFilters(initial);
    },

    bindFilters(initial) {
        const tabs = document.querySelectorAll('#revenueChartTabs .sp-chart-tab');
        const custom = document.getElementById('revenueChartCustom');
        const fromEl = document.getElementById('revenueChartFrom');
        const toEl = document.getElementById('revenueChartTo');

        if (fromEl && initial?.from) fromEl.value = initial.from;
        if (toEl && initial?.to) toEl.value = initial.to;

        tabs.forEach((btn) => {
            btn.addEventListener('click', () => {
                tabs.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.granularity = btn.dataset.granularity;
                custom?.classList.toggle('d-none', this.granularity !== 'custom');
                if (this.granularity !== 'custom') this.load();
            });
        });

        document.getElementById('revenueChartApply')?.addEventListener('click', () => this.load());
    },

    async load() {
        const loading = document.getElementById('revenueChartLoading');
        loading?.classList.remove('d-none');

        let url = `/revenue-chart?granularity=${encodeURIComponent(this.granularity)}`;
        if (this.granularity === 'custom') {
            const from = document.getElementById('revenueChartFrom')?.value;
            const to = document.getElementById('revenueChartTo')?.value;
            if (!from || !to) {
                loading?.classList.add('d-none');
                PosApi.toast?.(PosApi.t('home.pickDateRange', 'اختر الفترة'), 'warning');
                return;
            }
            url += `&from=${from}&to=${to}`;
        }

        const res = await PosApi.request(url);
        loading?.classList.add('d-none');
        if (!res.success) {
            PosApi.toast?.(res.message, 'error');
            return;
        }
        this.renderRevenue(res.data.labels, res.data.data);
        this.updateMeta(res.data);
    },

    renderRevenue(labels, data) {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.chart = SaasShell.revenueChart(this.canvasId, labels, data);
    },

    renderTrend(trend = {}) {
        const el = document.getElementById(this.trendCanvasId);
        if (!el || typeof Chart === 'undefined') return;
        if (this.trendChart) {
            this.trendChart.destroy();
            this.trendChart = null;
        }

        const t = (k, f) => (window.AdminI18n?.t?.(k, f) || f || k);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const ctx = el.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 280);
        grad.addColorStop(0, 'rgba(99,102,241,.35)');
        grad.addColorStop(1, 'rgba(99,102,241,0)');
        const gridC = isDark ? '#232d42' : '#eef2f7';
        const tickC = isDark ? '#6b7890' : '#94a3b8';

        this.trendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: trend.labels || [],
                datasets: [
                    {
                        type: 'line',
                        label: t('reports.seriesInvoiced', 'مفوتر'),
                        data: trend.invoiced || [],
                        borderColor: '#6366f1',
                        backgroundColor: grad,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        order: 1,
                    },
                    {
                        type: 'bar',
                        label: t('reports.seriesCollected', 'محصّل'),
                        data: trend.collected || [],
                        backgroundColor: 'rgba(34,197,94,.85)',
                        borderRadius: 8,
                        maxBarThickness: 28,
                        order: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8, color: tickC, font: { size: 11 } },
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1b2436' : '#0f172a',
                        padding: 12,
                        cornerRadius: 12,
                        callbacks: { label: (c) => `${c.dataset.label}: ${Number(c.parsed.y).toLocaleString()}` },
                    },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: tickC, font: { size: 11 } } },
                    y: { grid: { color: gridC }, ticks: { color: tickC, font: { size: 11 }, maxTicksLimit: 5 }, border: { display: false } },
                },
                animation: { duration: 900, easing: 'easeOutQuart' },
            },
        });
    },

    updateMeta(d) {
        const badge = document.getElementById('revenueChartBadge');
        if (badge && d?.from && d?.to) badge.textContent = `${d.from} → ${d.to}`;
        const totalEl = document.getElementById('revenueChartTotal');
        if (totalEl) totalEl.textContent = `${Number(d?.total || 0).toLocaleString()} USD`;
    },
};

window.HomeChart = HomeChart;
