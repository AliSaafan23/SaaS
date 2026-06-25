document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#auditTable tbody');

    const loadAudit = async () => {
        const res = await PosApi.request('/audit-logs');
        if (res.key !== 'success') return;
        tbody.innerHTML = res.data
            .map(
                (l) => `
            <tr>
                <td>${l.id}</td>
                <td>${l.userName || PosApi.t('common.emDash', '—')}</td>
                <td><code>${l.action}</code></td>
                <td>${l.module || PosApi.t('common.emDash', '—')}</td>
                <td>${PosApi.formatDate(l.createdAt)}</td>
            </tr>`
            )
            .join('') || `<tr><td colspan="5" class="text-center text-muted">${PosApi.t('audit.noRecords')}</td></tr>`;
    };

    document.getElementById('refreshAudit')?.addEventListener('click', loadAudit);
    loadAudit();

    window.onAdminLangChange = () => {
        loadAudit();
    };
});
