document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#usersTable tbody');
    const form = document.getElementById('userForm');
    const alertEl = document.getElementById('userAlert');
    const idInput = document.getElementById('userId');
    const roleSelect = document.getElementById('roleSelect');
    const cancelBtn = document.getElementById('cancelEdit');
    const formTitle = document.getElementById('formTitle');
    const submitBtnText = document.querySelector('#submitBtn span');
    const pwHint = document.getElementById('pwHint');
    const pwInput = form.querySelector('[name="password"]');

    const loadRoles = async () => {
        const res = await PosApi.request('/roles');
        if (res.success) {
            roleSelect.innerHTML = '<option value="" disabled selected>' + PosApi.t('common.select') + '</option>' +
                res.data.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        }
    };

    const load = async () => {
        const res = await PosApi.request('/users');
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        const rows = res.data || [];
        if (!rows.length) {
            tbody.innerHTML = SaasUI.emptyState('fa-users', PosApi.t('common.noData'));
            return;
        }
        tbody.innerHTML = rows
            .map(
                (u) => `<tr>
            <td>#${u.id}</td>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td><span class="badge bg-label-primary">${u.role?.name || '—'}</span></td>
            <td>${SaasUI.statusBadge(u.status)}</td>
            <td class="text-end">${SaasUI.actions(u.id)}</td></tr>`
            )
            .join('');
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(form));
        const id = idInput.value;
        
        if (id && !body.password) delete body.password;

        const res = await PosApi.request(id ? `/users/${id}` : '/users', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(body),
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
            const res = await PosApi.request(`/users/${id}`);
            if (res.success) {
                fillForm(res.data);
            }
        } else if (btn.classList.contains('del')) {
            const ok = await PosApi.confirmDelete();
            if (!ok) return;
            const res = await PosApi.request(`/users/${id}`, { method: 'DELETE' });
            if (res.success) {
                PosApi.showAlert(alertEl, res.message, 'success');
                load();
            }
        }
    });

    const fillForm = (data) => {
        idInput.value = data.id;
        form.querySelector('[name="name"]').value = data.name;
        form.querySelector('[name="email"]').value = data.email;
        form.querySelector('[name="roleId"]').value = data.roleId || '';
        form.querySelector('[name="status"]').value = data.status;
        pwInput.required = false;
        pwHint.classList.remove('d-none');
        
        formTitle.textContent = PosApi.t('common.edit');
        submitBtnText.textContent = PosApi.t('common.saveChanges');
        cancelBtn.classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        form.reset();
        idInput.value = '';
        pwInput.required = true;
        pwHint.classList.add('d-none');
        formTitle.textContent = PosApi.t('users.add');
        submitBtnText.textContent = PosApi.t('common.save');
        cancelBtn.classList.add('d-none');
    };

    cancelBtn?.addEventListener('click', resetForm);

    loadRoles();
    load();
});
