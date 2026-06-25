document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('roleForm');
    const alertEl = document.getElementById('roleFormAlert');
    const permList = document.getElementById('permissionsList');
    const tbody = document.querySelector('#rolesTable tbody');

    const loc = (obj, fallback = '') => obj?.[PosApi.getLang()] || obj?.ar || obj?.en || fallback;

    const loadPermissions = async () => {
        const res = await PosApi.request('/roles/permissions');
        if (res.key !== 'success') return;

        permList.innerHTML = res.data
            .map(
                (group) => `
            <div class="pos-perm-group">
                <div class="pos-perm-group-title">${loc(group.title) || group.key}</div>
                ${group.children
                    .map(
                        (child) => `
                    <div class="form-check pos-perm-item">
                        <input class="form-check-input perm-check" type="checkbox" value="${child.key}" id="perm_${child.key.replace(/\./g, '_')}">
                        <label class="form-check-label" for="perm_${child.key.replace(/\./g, '_')}">${loc(child.title) || child.key}</label>
                    </div>`
                    )
                    .join('')}
            </div>`
            )
            .join('');
    };

    const loadRoles = async () => {
        const res = await PosApi.request('/roles');
        if (res.key !== 'success') {
            PosApi.showAlert(alertEl, res.message);
            return;
        }
        tbody.innerHTML = res.data
            .map(
                (r) => `
            <tr>
                <td>${r.id}</td>
                <td><span class="badge rounded-pill" style="background:${r.color}22;color:${r.color}">${r.name}</span></td>
                <td><small>${(r.permissions || []).slice(0, 3).join(', ')}${r.permissions?.length > 3 ? '...' : ''}</small></td>
                <td>${r.isActive ? PosApi.statusBadge('active') : PosApi.statusBadge('block')}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger delete-role" data-id="${r.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`
            )
            .join('');
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        PosApi.hideAlert(alertEl);

        const permissions = [...document.querySelectorAll('.perm-check:checked')].map((el) => el.value);
        if (!permissions.length) {
            PosApi.showAlert(alertEl, PosApi.t('roles.minPermission'));
            return;
        }

        const fd = new FormData(form);
        const res = await PosApi.request('/roles', {
            method: 'POST',
            body: JSON.stringify({
                name: { ar: fd.get('name_ar'), en: fd.get('name_en') || fd.get('name_ar') },
                description: { ar: '', en: '' },
                permissions,
                color: fd.get('color'),
            }),
        });

        if (res.key === 'success') {
            PosApi.showAlert(alertEl, res.message, 'success');
            form.reset();
            document.querySelector('[name="color"]').value = '#6366f1';
            loadRoles();
        } else {
            PosApi.showAlert(alertEl, res.message);
        }
    });

    tbody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-role');
        if (!btn) return;
        const ok = await PosApi.confirm({
            title: PosApi.t('roles.deleteTitle'),
            message: PosApi.t('roles.deleteMessage'),
            confirmText: PosApi.t('common.delete'),
            cancelText: PosApi.t('dialog.cancel'),
            variant: 'danger',
        });
        if (!ok) return;
        const res = await PosApi.request(`/roles/${btn.dataset.id}`, { method: 'DELETE' });
        if (res.key === 'success') {
            PosApi.toast(res.message || PosApi.t('dialog.deleted'), 'success');
            loadRoles();
        } else PosApi.notify({ message: res.message, type: 'error' });
    });

    document.getElementById('refreshRoles')?.addEventListener('click', loadRoles);

    loadPermissions();
    loadRoles();

    window.onAdminLangChange = () => {
        loadPermissions();
        loadRoles();
    };
});
