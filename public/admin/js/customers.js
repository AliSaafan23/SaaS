document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#customersTable tbody');
    const form = document.getElementById('customerForm');
    const alertEl = document.getElementById('customerAlert');
    const idInput = document.getElementById('customerId');

    const avatarCell = (c) => {
        if (!c.avatar) return '<span class="text-muted">—</span>';
        return `<img src="${c.avatar}" alt="" class="saas-avatar-thumb" width="36" height="36">`;
    };

    const load = async () => {
        const res = await PosApi.request('/customers');
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        const rows = res.data || [];
        if (!rows.length) {
            tbody.innerHTML = SaasUI.emptyState('fa-users', PosApi.t('common.noData', 'No data yet'));
            return;
        }
        tbody.innerHTML = rows
            .map(
                (c) => `<tr>
            <td>#${c.id}</td>
            <td>${avatarCell(c)}</td>
            <td><strong>${c.name}</strong></td>
            <td>${c.email || '<span class="text-muted">—</span>'}</td>
            <td>${SaasUI.actions(c.id)}</td></tr>`
            )
            .join('');
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const id = idInput.value;
        const res = await PosApi.request(id ? `/customers/${id}` : '/customers', {
            method: id ? 'PUT' : 'POST',
            body: fd,
        });
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        form.reset();
        idInput.value = '';
        PosApi.showAlert(alertEl, res.message, 'success');
        load();
    });

    tbody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn?.classList.contains('del')) return;
        const res = await PosApi.request(`/customers/${btn.dataset.id}`, { method: 'DELETE' });
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        load();
    });

    load();
});
