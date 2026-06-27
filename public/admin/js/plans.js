document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#plansTable tbody');
    const form = document.getElementById('planForm');
    const alertEl = document.getElementById('planAlert');
    const idInput = document.getElementById('planId');

    const load = async () => {
        const res = await PosApi.request('/plans');
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        const rows = res.data || [];
        if (!rows.length) {
            tbody.innerHTML = SaasUI.emptyState('fa-layer-group', PosApi.t('common.noData', 'No data yet'));
            return;
        }
        tbody.innerHTML = rows
            .map(
                (p) => `<tr>
            <td><span class="text-muted">#${p.id}</span></td>
            <td><strong>${p.name}</strong></td>
            <td><span class="saas-money">${PosApi.formatMoney(p.price)}</span></td>
            <td>${SaasUI.statusBadge(p.billingCycle)}</td>
            <td>${SaasUI.actions(p.id)}</td></tr>`
            )
            .join('');
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const body = Object.fromEntries(fd.entries());
        body.price = Number(body.price);
        const id = idInput.value;
        const res = await PosApi.request(id ? `/plans/${id}` : '/plans', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(body),
        });
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        form.reset();
        idInput.value = '';
        PosApi.showAlert(alertEl, res.message, 'success');
        load();
    });

    tbody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;
        if (btn.classList.contains('del')) {
            const ok = await PosApi.confirmDelete();
            if (!ok) return;
            const res = await PosApi.request(`/plans/${id}`, { method: 'DELETE' });
            if (!res.success) return PosApi.showAlert(alertEl, res.message);
            return load();
        }
        if (btn.classList.contains('edit')) {
            const res = await PosApi.request(`/plans/${id}`);
            if (!res.success) return;
            const p = res.data;
            idInput.value = p.id;
            form.name.value = p.name;
            form.price.value = p.price;
            form.billingCycle.value = p.billingCycle;
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    load();
});
