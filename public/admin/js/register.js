document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const alertEl = document.getElementById('registerAlert');
    const btn = document.getElementById('registerBtn');

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        PosApi.hideAlert(alertEl);
        btn.disabled = true;
        const fd = new FormData(form);
        const body = Object.fromEntries(fd.entries());
        const res = await PosApi.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(body),
            skipRedirect: true,
        });
        btn.disabled = false;
        if (res.key === 'success') {
            window.location.href = '/dashboard/home';
            return;
        }
        PosApi.showAlert(alertEl, res.message || PosApi.t('auth.failed'));
    });
});
