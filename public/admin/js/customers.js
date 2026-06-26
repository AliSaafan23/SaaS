document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#customersTable tbody');
    const form = document.getElementById('customerForm');
    const alertEl = document.getElementById('customerAlert');
    const idInput = document.getElementById('customerId');
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarIcon = document.getElementById('avatarIcon');
    const cancelBtn = document.getElementById('cancelEdit');
    const formTitle = document.getElementById('formTitle');
    const submitBtnText = document.querySelector('#submitBtn span');

    const setAvatarPreview = (src) => {
        if (src) {
            avatarPreview.src = src;
            avatarPreview.classList.remove('d-none');
            avatarIcon.classList.add('d-none');
        } else {
            avatarPreview.src = '';
            avatarPreview.classList.add('d-none');
            avatarIcon.classList.remove('d-none');
        }
    };

    const avatarCell = (c) => {
        if (c.avatar) {
            return `<img src="${c.avatar}" alt="" class="rounded-circle border" width="36" height="36" style="object-fit: cover;">`;
        }
        return `<div class="rounded-circle border bg-light d-flex align-items-center justify-content-center" style="width: 36px; height: 36px;">
            <i class="fas fa-user text-muted" style="font-size: 14px;"></i>
        </div>`;
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
            <td>${SaasUI.statusBadge(c.status)}</td>
            <td class="text-end">${SaasUI.actions(c.id)}</td></tr>`
            )
            .join('');
    };

    // Avatar preview
    avatarInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setAvatarPreview(e.target.result);
            reader.readAsDataURL(file);
        }
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const id = idInput.value;
        
        const res = await PosApi.request(id ? `/customers/${id}` : '/customers', {
            method: id ? 'PUT' : 'POST',
            body: fd,
        });

        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        
        resetForm();
        PosApi.showAlert(alertEl, res.message, 'success');
        load();
    });

    tbody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = btn.dataset.id;
        if (btn.classList.contains('edit')) {
            const res = await PosApi.request(`/customers/${id}`);
            if (res.success) {
                fillForm(res.data);
            }
        } else if (btn.classList.contains('del')) {
            if (confirm(PosApi.t('common.confirmDelete', 'Are you sure?'))) {
                const res = await PosApi.request(`/customers/${id}`, { method: 'DELETE' });
                if (res.success) {
                    PosApi.showAlert(alertEl, res.message, 'success');
                    load();
                }
            }
        }
    });

    const fillForm = (data) => {
        idInput.value = data.id;
        form.querySelector('[name="name"]').value = data.name;
        form.querySelector('[name="email"]').value = data.email || '';
        form.querySelector('[name="status"]').value = data.status;
        setAvatarPreview(data.avatar);
        
        formTitle.textContent = PosApi.t('common.edit', 'Edit');
        submitBtnText.textContent = PosApi.t('common.saveChanges', 'Save Changes');
        cancelBtn.classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        form.reset();
        idInput.value = '';
        setAvatarPreview(null);
        formTitle.textContent = PosApi.t('customers.add');
        submitBtnText.textContent = PosApi.t('common.save');
        cancelBtn.classList.add('d-none');
    };

    cancelBtn?.addEventListener('click', resetForm);

    load();
});
