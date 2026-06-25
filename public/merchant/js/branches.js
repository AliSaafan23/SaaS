document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#branchesTable tbody');
    const modal = new bootstrap.Modal(document.getElementById('branchModal'));
    const form = document.getElementById('branchForm');
    const alertEl = document.getElementById('branchAlert');
    const t = (k, fb) => MerchantApi.t(k, fb);

    async function load() {
        const res = await MerchantApi.request('/branch/branches');
        if (res.key !== 'success') {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${t('common.loadFailed')}</td></tr>`;
            return;
        }

        if (!res.data?.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${t('branches.noBranches')}</td></tr>`;
            return;
        }

        tbody.innerHTML = res.data.map((b) => `
            <tr>
                <td>${b.name}</td>
                <td>${b.address || '—'}</td>
                <td>${b.phone || '—'}</td>
                <td>${b.cashierCount || 0}</td>
                <td>${MerchantApi.statusBadge(b.status)}</td>
                <td class="text-nowrap">
                    <a href="/merchant/ui/branches/${b.id}" class="btn btn-sm btn-outline-secondary" title="${t('branchDetail.view')}"><i class="fas fa-chart-bar"></i></a>
                    <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${b.id}" data-name="${b.name}" data-address="${b.address || ''}" data-phone="${b.phone || ''}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${b.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.edit-btn').forEach((btn) => {
            btn.addEventListener('click', () => openModal(btn.dataset));
        });
        tbody.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', () => removeBranch(btn.dataset.id));
        });
    }

    function openModal(data = {}) {
        MerchantApi.hideAlert(alertEl);
        document.getElementById('branchModalTitle').textContent = data.id ? t('branches.edit') : t('branches.new');
        document.getElementById('branchId').value = data.id || '';
        form.name.value = data.name || '';
        form.address.value = data.address || '';
        form.phone.value = data.phone || '';
        modal.show();
    }

    async function removeBranch(id) {
        const ok = await MerchantApi.confirm({
            title: t('dialog.deleteTitle'),
            message: t('branches.deleteConfirm'),
            confirmText: t('common.delete'),
            variant: 'danger',
        });
        if (!ok) return;

        const res = await MerchantApi.request(`/branch/branches/${id}`, { method: 'DELETE' });
        if (res.key === 'success') {
            MerchantApi.toast(res.message || t('dialog.successTitle'), 'success');
            load();
        } else {
            MerchantApi.notify({ message: res.message || t('common.deleteFailed'), type: 'error' });
        }
    }

    document.getElementById('addBranchBtn')?.addEventListener('click', () => openModal());

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        MerchantApi.hideAlert(alertEl);

        const fd = new FormData(form);
        const id = fd.get('id');
        const body = { name: fd.get('name'), address: fd.get('address'), phone: fd.get('phone') };

        const res = id
            ? await MerchantApi.request(`/branch/branches/${id}`, { method: 'PUT', body: JSON.stringify(body) })
            : await MerchantApi.request('/branch/branches', { method: 'POST', body: JSON.stringify(body) });

        if (res.key === 'success') {
            modal.hide();
            load();
            return;
        }

        MerchantApi.showAlert(alertEl, res.message || t('common.saveFailed'));
    });

    window.onMerchantLangChange = () => {
        MerchantI18n.apply();
        load();
    };

    load();
});
