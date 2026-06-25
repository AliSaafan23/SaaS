document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('adminForm');
    const alertEl = document.getElementById('adminFormAlert');
    const roleSelect = document.getElementById('adminRoleSelect');
    const tbody = document.querySelector('#adminsTable tbody');

    const loadRoles = async () => {
        const res = await PosApi.request('/roles');
        if (res.key !== 'success') return;
        roleSelect.innerHTML = `<option value="">${PosApi.t('admins.selectRole')}</option>`;
        res.data.forEach((role) => {
            roleSelect.innerHTML += `<option value="${role.id}">${role.name}</option>`;
        });
    };

    const loadAdmins = async () => {
        const res = await PosApi.request('/admins');
        if (res.key !== 'success') {
            PosApi.showAlert(alertEl, res.message);
            return;
        }
        tbody.innerHTML = res.data
            .map(
                (a) => `
            <tr>
                <td>${a.id}</td>
                <td>${a.name}</td>
                <td>${a.email}</td>
                <td>${a.role?.name || PosApi.t('common.emDash', '—')}</td>
                <td>${PosApi.statusBadge(a.status)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger delete-admin" data-id="${a.id}">
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
        const fd = new FormData(form);
        const res = await PosApi.request('/admins', {
            method: 'POST',
            body: JSON.stringify({
                name: fd.get('name'),
                email: fd.get('email'),
                phone: fd.get('phone') || '',
                password: fd.get('password'),
                role_id: fd.get('role_id'),
            }),
        });

        if (res.key === 'success') {
            PosApi.showAlert(alertEl, res.message, 'success');
            form.reset();
            loadAdmins();
        } else {
            PosApi.showAlert(alertEl, res.message);
        }
    });

    tbody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-admin');
        if (!btn) return;
        const ok = await PosApi.confirm({
            title: PosApi.t('admins.deleteTitle'),
            message: PosApi.t('admins.deleteMessage'),
            confirmText: PosApi.t('common.delete'),
            cancelText: PosApi.t('dialog.cancel'),
            variant: 'danger',
        });
        if (!ok) return;
        const res = await PosApi.request(`/admins/${btn.dataset.id}`, { method: 'DELETE' });
        if (res.key === 'success') {
            PosApi.toast(res.message || PosApi.t('dialog.deleted'), 'success');
            loadAdmins();
        } else PosApi.notify({ message: res.message, type: 'error' });
    });

    document.getElementById('refreshAdmins')?.addEventListener('click', loadAdmins);

    loadRoles();
    loadAdmins();

    window.onAdminLangChange = () => {
        loadRoles();
        loadAdmins();
    };
});
