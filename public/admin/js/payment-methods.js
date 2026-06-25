document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('paymentMethodForm');
    if (!form) return;

    const alertEl = document.getElementById('pmFormAlert');
    const tbody = document.querySelector('#paymentMethodsTable tbody');
    const cancelBtn = document.getElementById('cancelPmEdit');
    const formTitle = document.getElementById('pmFormTitle');
    const idInput = document.getElementById('pmId');

    const resetForm = () => {
        form.reset();
        if (idInput) idInput.value = '';
        document.getElementById('pmAffectsCashbox').checked = true;
        document.getElementById('pmRequiresCustomer').checked = false;
        document.getElementById('pmIsActive').checked = true;
        formTitle.textContent = PosApi.t('paymentMethods.formAddTitle');
        cancelBtn?.classList.add('d-none');
    };

    const fillForm = (row) => {
        idInput.value = row.id;
        form.nameAr.value = row.nameAr || row.name || '';
        form.nameEn.value = row.nameEn || '';
        form.code.value = row.code || '';
        form.sortOrder.value = row.sortOrder ?? 0;
        document.getElementById('pmAffectsCashbox').checked = row.affectsCashbox !== false;
        document.getElementById('pmRequiresCustomer').checked = Boolean(row.requiresCustomer);
        document.getElementById('pmIsActive').checked = row.isActive !== false;
        formTitle.textContent = PosApi.t('paymentMethods.formEditTitle');
        cancelBtn?.classList.remove('d-none');
    };

    const loadPaymentMethods = async () => {
        const res = await PosApi.request('/payment-methods');
        if (res.key !== 'success') {
            PosApi.showAlert(alertEl, res.message);
            return;
        }

        tbody.innerHTML = res.data.length
            ? res.data
                  .map(
                      (m) => `
            <tr>
                <td>${m.id}</td>
                <td>${m.name}</td>
                <td><code>${m.code}</code></td>
                <td>${m.affectsCashbox ? PosApi.t('common.yes') : PosApi.t('common.no')}</td>
                <td>${m.isActive ? PosApi.statusBadge('active') : PosApi.statusBadge('block')}</td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-pos-outline edit-pm" data-id="${m.id}" title="${PosApi.t('common.edit')}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-pm" data-id="${m.id}" title="${PosApi.t('common.delete')}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`
                  )
                  .join('')
            : `<tr><td colspan="6" class="text-muted text-center">${PosApi.t('paymentMethods.empty')}</td></tr>`;

        tbody.querySelectorAll('.edit-pm').forEach((btn) => {
            btn.addEventListener('click', () => {
                const row = res.data.find((m) => String(m.id) === btn.dataset.id);
                if (row) fillForm(row);
            });
        });
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        PosApi.hideAlert(alertEl);

        const fd = new FormData(form);
        const payload = {
            nameAr: fd.get('nameAr'),
            nameEn: fd.get('nameEn'),
            code: String(fd.get('code') || '').toLowerCase().replace(/\s+/g, '_'),
            sortOrder: Number(fd.get('sortOrder')) || 0,
            affectsCashbox: document.getElementById('pmAffectsCashbox').checked,
            requiresCustomer: document.getElementById('pmRequiresCustomer').checked,
            isActive: document.getElementById('pmIsActive').checked,
        };

        const id = idInput.value;
        const res = await PosApi.request(id ? `/payment-methods/${id}` : '/payment-methods', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(payload),
        });

        if (res.key === 'success') {
            PosApi.showAlert(alertEl, res.message, 'success');
            resetForm();
            loadPaymentMethods();
        } else {
            PosApi.showAlert(alertEl, res.message);
        }
    });

    cancelBtn?.addEventListener('click', resetForm);
    document.getElementById('refreshPaymentMethods')?.addEventListener('click', loadPaymentMethods);

    tbody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-pm');
        if (!btn) return;

        const ok = await PosApi.confirm({
            title: PosApi.t('paymentMethods.deleteTitle'),
            message: PosApi.t('paymentMethods.deleteMessage'),
            confirmText: PosApi.t('common.delete'),
            cancelText: PosApi.t('dialog.cancel'),
            variant: 'danger',
        });
        if (!ok) return;

        const res = await PosApi.request(`/payment-methods/${btn.dataset.id}`, { method: 'DELETE' });
        if (res.key === 'success') {
            PosApi.toast(res.message || PosApi.t('dialog.deleted'), 'success');
            loadPaymentMethods();
        } else {
            PosApi.toast(res.message, 'danger');
        }
    });

    const tabBtn = document.querySelector('[data-bs-target="#settingsPaymentMethods"]');
    tabBtn?.addEventListener('shown.bs.tab', loadPaymentMethods);
});
