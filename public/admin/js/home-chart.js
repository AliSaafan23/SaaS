/* Home dashboard — revenue chart filters */
const HomeChart = {
    chart: null,
    granularity: 'monthly',
    canvasId: 'revenueChart',

    init({ canvasId, initial }) {
        this.canvasId = canvasId || 'revenueChart';
        this.granularity = initial?.granularity || 'monthly';
        this.render(initial?.labels || [], initial?.data || []);
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
        this.render(res.data.labels, res.data.data);
        this.updateMeta(res.data);
    },

    render(labels, data) {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.chart = SaasShell.revenueChart(this.canvasId, labels, data);
    },

    updateMeta(d) {
        const badge = document.getElementById('revenueChartBadge');
        if (badge && d?.from && d?.to) badge.textContent = `${d.from} → ${d.to}`;
        const totalEl = document.getElementById('revenueChartTotal');
        if (totalEl) totalEl.textContent = `${Number(d?.total || 0).toLocaleString()} USD`;
    },
};

window.HomeChart = HomeChart;
