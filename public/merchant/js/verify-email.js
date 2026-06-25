function initVerifyEmailPage() {
    const form = document.getElementById('verifyForm');
    const alertEl = document.getElementById('verifyAlert');
    const resentEl = document.getElementById('verifyResentAlert');
    const resendBtn = document.getElementById('resendBtn');
    const card = document.querySelector('[data-resent]');

    if (form?.dataset.bound === '1') return;
    if (form) form.dataset.bound = '1';

    const params = new URLSearchParams(window.location.search);
    if (card?.dataset.resent === '1' || params.get('resent') === '1') {
        resentEl.textContent = MerchantApi.t('auth.verify.resentInfo');
        resentEl.classList.remove('d-none');
    }
    if (params.get('testCode')) {
        MerchantApi.showAlert(alertEl, `TEST: ${params.get('testCode')}`, 'info');
    }

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        MerchantApi.hideAlert(alertEl);

        const fd = new FormData(form);
        const res = await MerchantApi.request('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ email: fd.get('email'), code: fd.get('code') }),
            skipRedirect: true,
        });

        if (res.key === 'success') {
            MerchantApi.showAlert(alertEl, res.message || MerchantApi.t('auth.verify.success'), 'success');
            setTimeout(() => { window.location.href = '/merchant/login'; }, 1500);
            return;
        }

        MerchantApi.showAlert(alertEl, res.message || MerchantApi.t('auth.verify.failed'));
    });

    resendBtn?.addEventListener('click', async () => {
        const email = form?.email?.value;
        if (!email) return;

        const res = await MerchantApi.request('/auth/resend-activation', {
            method: 'POST',
            body: JSON.stringify({ email }),
            skipRedirect: true,
        });

        if (res.key === 'success') {
            let msg = res.message || MerchantApi.t('auth.verify.resentInfo');
            if (res.data?.activationCode) msg += ` — ${res.data.activationCode}`;
            resentEl.textContent = msg;
            resentEl.classList.remove('d-none');
        } else {
            MerchantApi.showAlert(alertEl, res.message || MerchantApi.t('auth.verify.failed'));
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVerifyEmailPage);
} else {
    initVerifyEmailPage();
}

window.initVerifyEmailPage = initVerifyEmailPage;
