document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('notifForm');
    const alertEl = document.getElementById('notifFormAlert');
    const tbody = document.querySelector('#notificationsTable tbody');

    const loadNotifications = async () => {
        const res = await PosApi.request('/notifications');
        if (res.key !== 'success') return;
        tbody.innerHTML = res.data
            .map(
                (n) => `
            <tr>
                <td>${n.id}</td>
                <td>${n.title}</td>
                <td><span class="badge rounded-pill text-bg-primary">${n.type || 'system'}</span></td>
                <td>${PosApi.formatDate(n.createdAt)}</td>
            </tr>`
            )
            .join('') || `<tr><td colspan="4" class="text-center text-muted">${PosApi.t('notifications.noItems')}</td></tr>`;
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        PosApi.hideAlert(alertEl);
        const fd = new FormData(form);
        const res = await PosApi.request('/notifications', {
            method: 'POST',
            body: JSON.stringify({
                title: fd.get('title'),
                message: fd.get('message'),
                type: fd.get('type'),
            }),
        });

        if (res.key === 'success') {
            PosApi.showAlert(alertEl, res.message, 'success');
            form.reset();
            loadNotifications();
        } else {
            PosApi.showAlert(alertEl, res.message);
        }
    });

    document.getElementById('refreshNotifications')?.addEventListener('click', loadNotifications);
    loadNotifications();

    window.onAdminLangChange = () => {
        loadNotifications();
    };
});
