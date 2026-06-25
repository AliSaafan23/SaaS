document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#cashiersTable tbody');
    const modal = new bootstrap.Modal(document.getElementById('cashierModal'));
    const form = document.getElementById('cashierForm');
    const alertEl = document.getElementById('cashierAlert');
    const branchSelect = document.getElementById('cashierBranchId');
    const cashierPasswordInput = document.getElementById('cashierPassword');
    const toggleCashierPassword = document.getElementById('toggleCashierPassword');
    const t = (k, fb) => MerchantApi.t(k, fb);
    let branches = [];

    function resetPasswordVisibility() {
        if (!cashierPasswordInput) return;
        cashierPasswordInput.type = 'password';
        if (toggleCashierPassword) {
            toggleCashierPassword.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }

    toggleCashierPassword?.addEventListener('click', () => {
        const isPass = cashierPasswordInput.type === 'password';
        cashierPasswordInput.type = isPass ? 'text' : 'password';
        toggleCashierPassword.innerHTML = isPass
            ? '<i class="fas fa-eye-slash"></i>'
            : '<i class="fas fa-eye"></i>';
    });

    async function loadBranches() {
        const res = await MerchantApi.request('/branch/branches');
        branches = res.key === 'success' ? (res.data || []) : [];
        branchSelect.innerHTML = branches.map((b) => `<option value="${b.id}">${b.name}</option>`).join('');
    }

    async function load() {
        const res = await MerchantApi.request('/cashier/cashiers');
        if (res.key !== 'success') {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${t('common.loadFailed')}</td></tr>`;
            return;
        }

        if (!res.data?.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${t('cashiers.noCashiers')}</td></tr>`;
            return;
        }

        tbody.innerHTML = res.data.map((c) => `
            <tr>
                <td>${c.name}</td>
                <td>${c.email}</td>
                <td>${c.branch?.name || '—'}</td>
                <td>${MerchantApi.statusBadge(c.status)}</td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-outline-primary edit-btn"
                        data-id="${c.id}" data-name="${c.name}" data-phone="${c.phone || ''}"
                        data-branch="${c.branch?.id || ''}" data-email="${c.email}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${c.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.edit-btn').forEach((btn) => {
            btn.addEventListener('click', () => openModal(btn.dataset, true));
        });
        tbody.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', () => removeCashier(btn.dataset.id));
        });
    }

    function openModal(data = {}, isEdit = false) {
        MerchantApi.hideAlert(alertEl);
        document.getElementById('cashierModalTitle').textContent = isEdit ? t('cashiers.edit') : t('cashiers.new');
        document.getElementById('cashierId').value = data.id || '';
        form.name.value = data.name || '';
        form.phone.value = data.phone || '';
        branchSelect.value = data.branch || branches[0]?.id || '';

        const emailWrap = document.getElementById('emailFieldWrap');
        const passWrap = document.getElementById('passwordFieldWrap');
        if (isEdit) {
            emailWrap.classList.add('d-none');
            passWrap.classList.add('d-none');
            form.email.removeAttribute('required');
            form.password.removeAttribute('required');
        } else {
            emailWrap.classList.remove('d-none');
            passWrap.classList.remove('d-none');
            form.email.value = '';
            form.password.value = '';
            resetPasswordVisibility();
            form.email.required = true;
            form.password.required = true;
        }

        modal.show();
    }

    async function removeCashier(id) {
        const ok = await MerchantApi.confirm({
            title: t('dialog.deleteTitle'),
            message: t('cashiers.deleteConfirm'),
            confirmText: t('common.delete'),
            variant: 'danger',
        });
        if (!ok) return;

        const res = await MerchantApi.request(`/cashier/cashiers/${id}`, { method: 'DELETE' });
        if (res.key === 'success') {
            MerchantApi.toast(res.message || t('dialog.successTitle'), 'success');
            load();
        } else {
            MerchantApi.notify({ message: res.message || t('common.deleteFailed'), type: 'error' });
        }
    }

    document.getElementById('addCashierBtn')?.addEventListener('click', async () => {
        if (!branches.length) await loadBranches();
        if (!branches.length) {
            MerchantApi.notify({ message: t('cashiers.createBranchFirst'), type: 'warning' });
            return;
        }
        openModal();
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        MerchantApi.hideAlert(alertEl);

        const fd = new FormData(form);
        const id = fd.get('id');
        const body = {
            name: fd.get('name'),
            phone: fd.get('phone'),
            branchId: Number(fd.get('branchId')),
        };

        let res;
        if (id) {
            res = await MerchantApi.request(`/cashier/cashiers/${id}`, {
                method: 'PUT',
                body: JSON.stringify(body),
            });
        } else {
            body.email = fd.get('email');
            body.password = fd.get('password');
            res = await MerchantApi.request('/cashier/cashiers', {
                method: 'POST',
                body: JSON.stringify(body),
            });
        }

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

    (async () => {
        await loadBranches();
        await load();
    })();
});
