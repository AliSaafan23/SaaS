document.addEventListener('DOMContentLoaded', async () => {
    const content = document.getElementById('profileContent');
    const stats = document.getElementById('profileStats');
    const t = (k, fb) => MerchantApi.t(k, fb);

    async function load() {
        const res = await MerchantApi.request('/company/profile');
        if (res.key !== 'success' || !res.data) {
            content.innerHTML = `<p class="text-danger">${t('profile.loadFailed')}</p>`;
            return;
        }

        const d = res.data;
        content.innerHTML = `
            <dl class="row mb-0">
                <dt class="col-sm-3">${t('common.name')}</dt><dd class="col-sm-9">${d.name}</dd>
                <dt class="col-sm-3">${t('common.email')}</dt><dd class="col-sm-9">${d.email}</dd>
                <dt class="col-sm-3">${t('common.phone')}</dt><dd class="col-sm-9">${d.phone || '—'}</dd>
                <dt class="col-sm-3">${t('common.company')}</dt><dd class="col-sm-9">${d.company?.name || '—'}</dd>
                <dt class="col-sm-3">${t('profile.companyAddress')}</dt><dd class="col-sm-9">${d.company?.address || '—'}</dd>
                <dt class="col-sm-3">${t('profile.companyStatus')}</dt><dd class="col-sm-9">${MerchantApi.statusBadge(d.company?.status)}</dd>
            </dl>
        `;

        stats.innerHTML = `
            <p class="mb-2"><strong>${t('profile.branchesStat')}:</strong> ${d.stats?.branchCount || 0} / ${d.stats?.maxBranches || '—'}</p>
            <p class="mb-0"><strong>${t('profile.cashiersStat')}:</strong> ${d.stats?.cashierCount || 0} / ${d.stats?.maxDevices || '—'}</p>
        `;
    }

    window.onMerchantLangChange = () => {
        MerchantI18n.apply();
        load();
    };

    await load();
});
