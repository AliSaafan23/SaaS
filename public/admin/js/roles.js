document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#rolesTable tbody');
    const form = document.getElementById('roleForm');
    const alertEl = document.getElementById('roleAlert');
    const idInput = document.getElementById('roleId');
    const permissionsGrid = document.getElementById('permissionsGrid');
    const cancelBtn = document.getElementById('cancelEdit');
    const formTitle = document.getElementById('formTitle');
    const submitBtnText = document.querySelector('#submitBtn span');

    const ALL_PERMISSIONS = [
        { key: 'plans.read', label: 'Plans: Read' },
        { key: 'plans.manage', label: 'Plans: Manage' },
        { key: 'customers.read', label: 'Customers: Read' },
        { key: 'customers.manage', label: 'Customers: Manage' },
        { key: 'subscriptions.read', label: 'Subscriptions: Read' },
        { key: 'subscriptions.manage', label: 'Subscriptions: Manage' },
        { key: 'billing.read', label: 'Billing: Read' },
        { key: 'billing.manage', label: 'Billing: Manage' },
        { key: 'reports.read', label: 'Reports: Read' },
        { key: 'users.manage', label: 'Users: Manage' },
        { key: 'roles.manage', label: 'Roles: Manage' },
    ];

    const renderPermissions = () => {
        permissionsGrid.innerHTML = ALL_PERMISSIONS.map(p => `
            <div class="pos-perm-item mb-2">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${p.key}" id="perm_${p.key.replace('.', '_')}">
                    <label class="form-check-label small" for="perm_${p.key.replace('.', '_')}">
                        ${p.label}
                    </label>
                </div>
            </div>
        `).join('');
    };

    const load = async () => {
        const res = await PosApi.request('/roles');
        if (!res.success) return PosApi.showAlert(alertEl, res.message);
        const rows = res.data || [];
        if (!rows.length) {
            tbody.innerHTML = SaasUI.emptyState('fa-shield-alt', PosApi.t('common.noData'));
            return;
        }
        tbody.innerHTML = rows
            .map(
                (r) => `<tr>
            <td>#${r.id}</td>
            <td><strong>${r.name}</strong> ${r.isSystem ? '<span class="badge bg-label-info ms-1">System</span>' : ''}</td>
            <td><small class="text-muted">${r.permissions.includes('*') ? 'All Permissions' : r.permissions.length + ' Permissions'}</small></td>
            <td class="text-end">${r.isSystem ? '' : SaasUI.actions(r.id)}</td></tr>`
            )
            .join('');
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.querySelector('[name="name"]').value;
        const permissions = Array.from(permissionsGrid.querySelectorAll('input:checked')).map(i => i.value);
        const id = idInput.value;
        
        const res = await PosApi.request(id ? `/roles/${id}` : '/roles', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify({ name, permissions }),
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
            const res = await PosApi.request(`/roles/${id}`);
            if (res.success) {
                fillForm(res.data);
            }
        } else if (btn.classList.contains('del')) {
            if (confirm(PosApi.t('common.confirmDelete'))) {
                const res = await PosApi.request(`/roles/${id}`, { method: 'DELETE' });
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
        
        // Reset and fill checkboxes
        permissionsGrid.querySelectorAll('input').forEach(i => i.checked = false);
        if (data.permissions.includes('*')) {
            permissionsGrid.querySelectorAll('input').forEach(i => i.checked = true);
        } else {
            data.permissions.forEach(p => {
                const input = permissionsGrid.querySelector(`input[value="${p}"]`);
                if (input) input.checked = true;
            });
        }
        
        formTitle.textContent = PosApi.t('common.edit');
        submitBtnText.textContent = PosApi.t('common.saveChanges');
        cancelBtn.classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        form.reset();
        idInput.value = '';
        permissionsGrid.querySelectorAll('input').forEach(i => i.checked = false);
        formTitle.textContent = PosApi.t('roles.add');
        submitBtnText.textContent = PosApi.t('common.save');
        cancelBtn.classList.add('d-none');
    };

    cancelBtn?.addEventListener('click', resetForm);

    renderPermissions();
    load();
});
