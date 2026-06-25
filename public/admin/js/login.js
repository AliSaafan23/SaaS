document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const alertEl = document.getElementById('loginAlert');
    const btn = document.getElementById('loginBtn');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    const submitHtml = () =>
        `<span>${PosApi.t('auth.submit')}</span><i class="fas fa-sign-in-alt"></i>`;

    togglePassword?.addEventListener('click', () => {
        const isPass = passwordInput.type === 'password';
        passwordInput.type = isPass ? 'text' : 'password';
        togglePassword.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        PosApi.hideAlert(alertEl);
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${PosApi.t('auth.submitting')}`;

        const formData = new FormData(form);
        const body = {
            email: formData.get('email'),
            password: formData.get('password'),
        };

        const res = await PosApi.request('/auth/signin', {
            method: 'POST',
            body: JSON.stringify(body),
            skipRedirect: true,
        });

        btn.disabled = false;
        btn.innerHTML = submitHtml();

        if (res.key === 'success') {
            window.location.href = '/dashboard/home';
            return;
        }

        PosApi.showAlert(alertEl, res.message || PosApi.t('auth.failed'));
    });

    window.onAdminLangChange = () => {
        if (btn && !btn.disabled) btn.innerHTML = submitHtml();
    };
});
