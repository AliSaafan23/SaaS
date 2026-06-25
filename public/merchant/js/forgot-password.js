function initForgotPasswordPage() {
    const form = document.getElementById('forgotForm');
    const alertEl = document.getElementById('forgotAlert');

    if (form?.dataset.bound === '1') return;
    if (form) form.dataset.bound = '1';

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        MerchantApi.hideAlert(alertEl);

        const fd = new FormData(form);
        const res = await MerchantApi.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email: fd.get('email') }),
            skipRedirect: true,
        });

        if (res.key === 'success') {
            MerchantApi.showAlert(alertEl, res.message || MerchantApi.t('auth.forgot.submit'), 'success');
            setTimeout(() => {
                window.location.href = `/merchant/reset-password?email=${encodeURIComponent(fd.get('email'))}`;
            }, 2000);
            return;
        }

        MerchantApi.showAlert(alertEl, res.message || MerchantApi.t('auth.forgot.failed'));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForgotPasswordPage);
} else {
    initForgotPasswordPage();
}

window.initForgotPasswordPage = initForgotPasswordPage;
