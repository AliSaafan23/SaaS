function initLoginPage() {
    const form = document.getElementById('loginForm');
    const alertEl = document.getElementById('loginAlert');
    const btn = document.getElementById('loginBtn');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (form?.dataset.bound === '1') return;
    if (form) form.dataset.bound = '1';

    togglePassword?.addEventListener('click', () => {
        const isPass = passwordInput.type === 'password';
        passwordInput.type = isPass ? 'text' : 'password';
        togglePassword.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        MerchantApi.hideAlert(alertEl);
        btn.disabled = true;
        const submitLabel = MerchantApi.t('auth.login.submit');
        const loadingLabel = MerchantApi.t('auth.login.submitting');
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${loadingLabel}`;

        const formData = new FormData(form);
        const res = await MerchantApi.request('/auth/signin', {
            method: 'POST',
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password'),
            }),
            skipRedirect: true,
        });

        btn.disabled = false;
        btn.innerHTML = `<span>${submitLabel}</span><i class="fas fa-sign-in-alt"></i>`;

        if (res.key === 'success') {
            window.location.href = '/merchant/home';
            return;
        }

        if (res.key === 'needsVerification' || res.data?.needsEmailVerification) {
            const email = res.data?.email || formData.get('email');
            let url = res.data?.redirect
                || `/merchant/verify-email?email=${encodeURIComponent(email)}&resent=1`;
            if (res.data?.activationCode) {
                url += `&testCode=${encodeURIComponent(res.data.activationCode)}`;
            }
            window.location.href = url;
            return;
        }

        MerchantApi.showAlert(alertEl, res.message || MerchantApi.t('auth.login.failed'));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
    initLoginPage();
}

window.initLoginPage = initLoginPage;
