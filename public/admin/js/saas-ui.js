const SaasUI = {
    t(key, fallback = '') {
        return (typeof AdminI18n !== 'undefined' && AdminI18n.t)
            ? AdminI18n.t(key, fallback)
            : fallback || key;
    },

    money(n) {
        return typeof PosApi !== 'undefined' ? PosApi.formatMoney(n) : Number(n || 0).toFixed(2);
    },

    badge(text, type = 'neutral') {
        return `<span class="saas-badge saas-badge--${type}">${text}</span>`;
    },

    statusBadge(status) {
        const map = {
            active: 'success',
            paid: 'success',
            open: 'warning',
            cancelled: 'danger',
            paused: 'neutral',
            inactive: 'neutral',
            monthly: 'info',
            annual: 'info',
        };
        const type = map[status] || 'neutral';
        const label = this.t(`status.${status}`, status);
        return this.badge(label, type);
    },

    emptyState(icon, message) {
        return `<tr><td colspan="20"><div class="saas-empty"><i class="fas ${icon}"></i><div>${message}</div></div></td></tr>`;
    },

    actions(editId, showDelete = true) {
        return `<div class="saas-actions">
            <button type="button" class="saas-btn-ghost edit" data-id="${editId}"><i class="fas fa-pen"></i></button>
            ${showDelete ? `<button type="button" class="saas-btn-ghost danger del" data-id="${editId}"><i class="fas fa-trash"></i></button>` : ''}
        </div>`;
    },

    formatJson(data) {
        return JSON.stringify(data, null, 2);
    },

    initPage() {
        document.querySelectorAll('.saas-stagger-item').forEach((el, i) => {
            el.style.animationDelay = `${i * 0.06}s`;
        });
        document.querySelectorAll('.pos-nav-item.active').forEach((el) => {
            el.style.animation = 'saasNavPulse 0.5s ease';
        });
    },

    animateIn(root) {
        root?.querySelectorAll('.saas-metric-card, .saas-fin-row, .saas-result-banner').forEach((el, i) => {
            el.classList.add('saas-pop-in');
            el.style.animationDelay = `${i * 0.07}s`;
        });
    },

    setLoading(container, loading) {
        if (!container) return;
        container.classList.toggle('is-loading', loading);
    },

    errorState(message) {
        return `<div class="saas-result-banner saas-result-banner--error">
            <i class="fas fa-exclamation-circle"></i>
            <div><strong>${this.t('common.error', 'خطأ')}</strong><p>${message}</p></div>
        </div>`;
    },

    renderIncomeStatement(data = {}) {
        const revenue = data.subscriptionRevenue ?? 0;
        const from = data.from || '—';
        const to = data.to || '—';
        return `
        <div class="saas-report-summary">
            <div class="saas-metric-card saas-metric-card--hero">
                <div class="saas-metric-card__icon pos-icon-green"><i class="fas fa-chart-line"></i></div>
                <div class="saas-metric-card__body">
                    <span class="saas-metric-card__label">${this.t('reports.subscriptionRevenue')}</span>
                    <span class="saas-metric-card__value">${this.money(revenue)}</span>
                    <span class="saas-metric-card__meta"><i class="fas fa-calendar-alt"></i> ${from} → ${to}</span>
                </div>
            </div>
            <div class="saas-fin-table-wrap">
                <table class="saas-fin-table">
                    <thead><tr><th>${this.t('reports.account')}</th><th>${this.t('reports.amount')}</th></tr></thead>
                    <tbody>
                        <tr class="saas-fin-row">
                            <td><i class="fas fa-coins text-success"></i> ${this.t('reports.subscriptionRevenue')}</td>
                            <td class="saas-money">${this.money(revenue)}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr><td><strong>${this.t('reports.total')}</strong></td><td class="saas-money"><strong>${this.money(revenue)}</strong></td></tr>
                    </tfoot>
                </table>
            </div>
        </div>`;
    },

    renderBalanceSheet(data = {}) {
        const rows = [
            { key: 'cash', icon: 'fa-wallet', color: 'pos-icon-green', label: this.t('reports.cash'), value: data.cash },
            { key: 'ar', icon: 'fa-hand-holding-usd', color: 'pos-icon-blue', label: this.t('reports.ar'), value: data.accountsReceivable },
            { key: 'deferred', icon: 'fa-hourglass-half', color: 'pos-icon-amber', label: this.t('reports.deferred'), value: data.deferredRevenue },
        ];
        const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
        const metrics = rows.map((r) => `
            <div class="saas-metric-card saas-metric-card--compact">
                <div class="saas-metric-card__icon ${r.color}"><i class="fas ${r.icon}"></i></div>
                <div class="saas-metric-card__body">
                    <span class="saas-metric-card__label">${r.label}</span>
                    <span class="saas-metric-card__value">${this.money(r.value)}</span>
                </div>
            </div>`).join('');

        const tableRows = rows.map((r) => `
            <tr class="saas-fin-row">
                <td><i class="fas ${r.icon}"></i> ${r.label}</td>
                <td class="saas-money">${this.money(r.value)}</td>
            </tr>`).join('');

        return `
        <div class="saas-report-summary">
            <div class="saas-report-period"><i class="fas fa-calendar-check"></i> ${this.t('reports.asOf')}: <strong>${data.asOf || '—'}</strong></div>
            <div class="saas-metric-grid">${metrics}</div>
            <div class="saas-fin-table-wrap">
                <table class="saas-fin-table">
                    <thead><tr><th>${this.t('reports.account')}</th><th>${this.t('reports.balance')}</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                    <tfoot>
                        <tr><td><strong>${this.t('reports.totalAssets')}</strong></td><td class="saas-money"><strong>${this.money(total)}</strong></td></tr>
                    </tfoot>
                </table>
            </div>
        </div>`;
    },

    renderRevenueResult(data, message) {
        const count = data?.count ?? (Array.isArray(data) ? data.length : 0);
        return `<div class="saas-result-banner saas-result-banner--success">
            <i class="fas fa-check-circle"></i>
            <div>
                <strong>${message || this.t('reports.revenueDone', 'تم اعتراف الإيراد')}</strong>
                <p>${this.t('reports.revenueCount', 'عدد الفواتير')}: <span class="saas-badge saas-badge--success">${count}</span></p>
            </div>
        </div>`;
    },
};

document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('[data-skip-saas-init]')) {
        SaasUI.initPage();
    }
});
