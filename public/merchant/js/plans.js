document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('plansGrid');
    const alertEl = document.getElementById('plansAlert');
    let selectedPlatform = '';
    const t = (k, fb) => MerchantApi.t(k, fb);

    async function loadPlans() {
        const q = selectedPlatform ? `?platform=${selectedPlatform}` : '';
        const res = await MerchantApi.request(`/subscription/plans${q}`);

        if (res.key !== 'success' || !Array.isArray(res.data)) {
            grid.innerHTML = `<div class="col-12 mpr-empty-state"><i class="fas fa-crown d-block"></i>${t('plans.noPlans')}</div>`;
            return;
        }

        if (!res.data.length) {
            grid.innerHTML = `<div class="col-12 mpr-empty-state">${t('plans.noPlansPlatform')}</div>`;
            return;
        }

        grid.innerHTML = res.data.map((plan) => `
            <div class="col-md-6 col-lg-4">
                <div class="mpr-plan-card" data-plan-id="${plan.id}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="mb-0">${plan.name}</h5>
                        <span class="badge text-bg-light">${plan.platform}</span>
                    </div>
                    <p class="text-muted small">${plan.description || ''}</p>
                    <div class="mpr-plan-price">${plan.price} <small>${t('currency')}</small></div>
                    <small class="text-muted">${MerchantApi.billingLabel(plan.billingCycle)}</small>
                    <ul class="mpr-plan-features">
                        <li><i class="fas fa-check"></i> ${MerchantApi.tpl('plans.upToBranches', { n: plan.maxBranches })}</li>
                        <li><i class="fas fa-check"></i> ${MerchantApi.tpl('plans.upToCashiers', { n: plan.maxDevices })}</li>
                        <li><i class="fas fa-check"></i> ${MerchantApi.tpl('plans.upToProducts', { n: plan.maxProducts || '—' })}</li>
                    </ul>
                    <button type="button" class="btn btn-pos-primary w-100 subscribe-btn" data-id="${plan.id}">
                        ${t('plans.subscribeNow')}
                    </button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.subscribe-btn').forEach((btn) => {
            btn.addEventListener('click', () => subscribe(btn.dataset.id));
        });
    }

    async function subscribe(planId) {
        MerchantApi.hideAlert(alertEl);
        const res = await MerchantApi.request('/subscription/subscribe', {
            method: 'POST',
            body: JSON.stringify({ subscriptionPlanId: Number(planId) }),
        });

        if (res.key === 'success') {
            window.location.href = '/merchant/payment-pending';
            return;
        }

        MerchantApi.showAlert(alertEl, res.message || t('plans.subscribeFailed'));
    }

    document.querySelectorAll('#platformFilter button').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#platformFilter button').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            selectedPlatform = btn.dataset.platform || '';
            loadPlans();
        });
    });

    window.onMerchantLangChange = () => {
        MerchantI18n.apply();
        loadPlans();
    };

    loadPlans();
});
