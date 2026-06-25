document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('countryForm');
    const alertEl = document.getElementById('countryFormAlert');
    const tbody = document.querySelector('#countriesTable tbody');
    const cancelBtn = document.getElementById('cancelCountryEdit');
    const formTitle = document.getElementById('countryFormTitle');
    const idInput = document.getElementById('countryId');

    const resetForm = () => {
        form?.reset();
        if (idInput) idInput.value = '';
        document.getElementById('countryIsActive').checked = true;
        formTitle.textContent = PosApi.t('countries.formAddTitle');
        cancelBtn?.classList.add('d-none');
    };

    const fillForm = (row) => {
        idInput.value = row.id;
        form.nameAr.value = row.nameAr || row.name || '';
        form.nameEn.value = row.nameEn || '';
        form.code.value = row.code || '';
        form.phoneCode.value = row.phoneCode || '';
        form.sortOrder.value = row.sortOrder ?? 0;
        document.getElementById('countryIsActive').checked = row.isActive !== false;
        formTitle.textContent = PosApi.t('countries.formEditTitle');
        cancelBtn?.classList.remove('d-none');
    };

    const loadCountries = async () => {
        const res = await PosApi.request('/countries?all=1');
        if (res.key !== 'success') {
            PosApi.showAlert(alertEl, res.message);
            return;
        }

        tbody.innerHTML = res.data.length
            ? res.data
                  .map(
                      (c) => `
            <tr>
                <td>${c.id}</td>
                <td>${c.name}</td>
                <td><code>${c.code}</code></td>
                <td>${c.phoneCode || PosApi.t('common.emDash')}</td>
                <td>${c.isActive ? PosApi.statusBadge('active') : PosApi.statusBadge('block')}</td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-pos-outline edit-country" data-id="${c.id}" title="${PosApi.t('common.edit')}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-country" data-id="${c.id}" title="${PosApi.t('common.delete')}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`
                  )
                  .join('')
            : `<tr><td colspan="6" class="text-muted text-center">${PosApi.t('countries.empty')}</td></tr>`;

        tbody.querySelectorAll('.edit-country').forEach((btn) => {
            btn.addEventListener('click', () => {
                const row = res.data.find((c) => String(c.id) === btn.dataset.id);
                if (row) fillForm(row);
            });
        });
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        PosApi.hideAlert(alertEl);

        const fd = new FormData(form);
        const payload = {
            nameAr: fd.get('nameAr'),
            nameEn: fd.get('nameEn'),
            code: String(fd.get('code') || '').toUpperCase(),
            phoneCode: fd.get('phoneCode') || '',
            sortOrder: Number(fd.get('sortOrder')) || 0,
            isActive: document.getElementById('countryIsActive').checked,
        };

        const id = idInput.value;
        const res = await PosApi.request(id ? `/countries/${id}` : '/countries', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(payload),
        });

        if (res.key === 'success') {
            PosApi.showAlert(alertEl, res.message, 'success');
            resetForm();
            loadCountries();
        } else {
            PosApi.showAlert(alertEl, res.message);
        }
    });

    cancelBtn?.addEventListener('click', resetForm);
    document.getElementById('refreshCountries')?.addEventListener('click', loadCountries);

    tbody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-country');
        if (!btn) return;

        const ok = await PosApi.confirm({
            title: PosApi.t('countries.deleteTitle'),
            message: PosApi.t('countries.deleteMessage'),
            confirmText: PosApi.t('common.delete'),
            cancelText: PosApi.t('dialog.cancel'),
            variant: 'danger',
        });
        if (!ok) return;

        const res = await PosApi.request(`/countries/${btn.dataset.id}`, { method: 'DELETE' });
        if (res.key === 'success') {
            PosApi.toast(res.message || PosApi.t('dialog.deleted'), 'success');
            loadCountries();
        } else {
            PosApi.toast(res.message, 'danger');
        }
    });

    loadCountries();
});
