document.addEventListener('DOMContentLoaded', async () => {
    const t = (k, fb) => MerchantApi.t(k, fb);

    async function load() {
        const res = await MerchantApi.request('/company/profile');
        if (res.key !== 'success' || !res.data) return;

        const d = res.data;
        document.getElementById('statBranches').textContent = `${d.stats?.branchCount || 0} / ${d.stats?.maxBranches || '—'}`;
        document.getElementById('statCashiers').textContent = `${d.stats?.cashierCount || 0} / ${d.stats?.maxDevices || '—'}`;
        document.getElementById('statPlan').textContent = d.subscription?.plan?.name || '—';
        document.getElementById('statExpires').textContent =
            MerchantApi.formatDate(d.subscription?.expiresAt) || MerchantApi.lifetimeLabel();
        document.getElementById('welcomeText').textContent = MerchantApi.tpl('home.welcomeMsg', {
            name: d.name,
            company: d.company?.name || '',
        });
    }

    window.onMerchantLangChange = () => {
        MerchantI18n.apply();
        load();
    };

    await load();
});
