document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('subscriptionContent');
    const t = (k, fb) => MerchantApi.t(k, fb);

    async function load() {
        const res = await MerchantApi.request('/subscription/status');

        if (res.key !== 'success') {
            container.innerHTML = `<p class="text-danger">${t('subscription.loadFailed')}</p>`;
            return;
        }

        const subs = res.data || [];
        if (!subs.length) {
            container.innerHTML = `
                <div class="mpr-empty-state">
                    <i class="fas fa-crown d-block"></i>
                    <p>${t('subscription.noSubscription')}</p>
                    <a href="/merchant/plans" class="btn btn-pos-primary btn-sm">${t('subscription.choosePlan')}</a>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table pos-table">
                    <thead>
                        <tr>
                            <th>${t('common.plan')}</th>
                            <th>${t('common.platform')}</th>
                            <th>${t('common.status')}</th>
                            <th>${t('common.startsAt')}</th>
                            <th>${t('common.expiresAt')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subs.map((s) => `
                            <tr>
                                <td>${s.plan?.name || '—'}</td>
                                <td>${s.platform}</td>
                                <td>${MerchantApi.statusBadge(s.status)}</td>
                                <td>${MerchantApi.formatDate(s.startsAt)}</td>
                                <td>${MerchantApi.formatDate(s.expiresAt) || MerchantApi.lifetimeLabel()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    window.onMerchantLangChange = () => {
        MerchantI18n.apply();
        load();
    };

    load();
});
