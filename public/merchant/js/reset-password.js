function initResetPasswordPage() {
    const form = document.getElementById('resetForm');
    const alertEl = document.getElementById('resetAlert');

    if (form?.dataset.bound === '1') return;
    if (form) form.dataset.bound = '1';

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        MerchantApi.hideAlert(alertEl);

        const fd = new FormData(form);
        const res = await MerchantApi.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({
                email: fd.get('email'),
                code: fd.get('code'),
                password: fd.get('password'),
                confirmPassword: fd.get('confirmPassword'),
            }),
            skipRedirect: true,
        });

        if (res.key === 'success') {
            MerchantApi.showAlert(alertEl, res.message || MerchantApi.t('auth.reset.success'), 'success');
            setTimeout(() => { window.location.href = '/merchant/login'; }, 1500);
            return;
        }

        MerchantApi.showAlert(alertEl, res.message || MerchantApi.t('auth.reset.failed'));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResetPasswordPage);
} else {
    initResetPasswordPage();
}

window.initResetPasswordPage = initResetPasswordPage;
