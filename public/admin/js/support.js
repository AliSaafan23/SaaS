document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#ticketsTable tbody');
    const alertEl = document.getElementById('supportAlert');

    const ticketStatusBadge = (status) => {
        const keyMap = {
            open: 'support.statusOpen',
            in_progress: 'support.statusInProgress',
            resolved: 'support.statusResolved',
            closed: 'support.statusClosed',
        };
        const clsMap = {
            open: 'text-bg-warning',
            in_progress: 'text-bg-info',
            resolved: 'text-bg-success',
            closed: 'text-bg-secondary',
        };
        const label = PosApi.t(keyMap[status] || status, status);
        const cls = clsMap[status] || 'text-bg-secondary';
        return `<span class="badge rounded-pill ${cls}">${label}</span>`;
    };

    const loadTickets = async () => {
        const res = await PosApi.request('/support');
        if (res.key !== 'success') {
            PosApi.showAlert(alertEl, res.message);
            return;
        }
        tbody.innerHTML = res.data
            .map(
                (t) => `
            <tr>
                <td>${t.id}</td>
                <td>${t.cashier?.name || PosApi.t('common.emDash', '—')}</td>
                <td>${t.subject || t.title || PosApi.t('common.emDash', '—')}</td>
                <td>${ticketStatusBadge(t.status)}</td>
                <td>${PosApi.formatDate(t.createdAt)}</td>
                <td>
                    ${t.status !== 'resolved' && t.status !== 'closed'
                        ? `<button class="btn btn-sm btn-outline-success resolve-ticket" data-id="${t.id}"><i class="fas fa-check"></i></button>`
                        : ''}
                </td>
            </tr>`
            )
            .join('') || `<tr><td colspan="6" class="text-center text-muted">${PosApi.t('support.noTickets')}</td></tr>`;
    };

    tbody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.resolve-ticket');
        if (!btn) return;
        const res = await PosApi.request(`/support/${btn.dataset.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'resolved' }),
        });
        if (res.key === 'success') {
            PosApi.toast(res.message || PosApi.t('support.ticketUpdated'), 'success');
            loadTickets();
        } else PosApi.notify({ message: res.message, type: 'error' });
    });

    document.getElementById('refreshTickets')?.addEventListener('click', loadTickets);
    loadTickets();

    window.onAdminLangChange = () => {
        loadTickets();
    };
});
