document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('profileForm');
    const alertEl = document.getElementById('profileAlert');
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarIcon = document.getElementById('avatarIcon');
    const submitBtn = document.getElementById('profileSubmit');

    avatarInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            avatarPreview.src = ev.target.result;
            avatarPreview.classList.remove('d-none');
            avatarIcon?.classList.add('d-none');
        };
        reader.readAsDataURL(file);
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);

        // Don't send empty password fields
        if (!fd.get('newPassword')) {
            fd.delete('newPassword');
            fd.delete('currentPassword');
        }
        // Don't send empty avatar
        const avatarFile = fd.get('avatar');
        if (avatarFile && avatarFile.size === 0) fd.delete('avatar');

        submitBtn.disabled = true;
        const res = await PosApi.request('/auth/profile', { method: 'PUT', body: fd });
        submitBtn.disabled = false;

        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        PosApi.showAlert(alertEl, res.message, 'success');
        // Reload so the navbar avatar/name refresh
        setTimeout(() => window.location.reload(), 900);
    });
});
