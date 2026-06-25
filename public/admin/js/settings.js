document.addEventListener('DOMContentLoaded', () => {
    const alertEl = document.getElementById('settingsAlert');
    let settingsCache = {};
    let featuresCatalog = [];

    const formToObject = (form) => {
        const data = {};
        new FormData(form).forEach((value, key) => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input?.type === 'checkbox' && !input.classList.contains('free-feature-cb')) {
                data[key] = input.checked;
            } else if (!input?.classList.contains('free-feature-cb')) {
                data[key] = value;
            }
        });
        form.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            if (!cb.classList.contains('free-feature-cb') && !data.hasOwnProperty(cb.name)) {
                data[cb.name] = cb.checked;
            }
        });
        return data;
    };

    const objectToForm = (form, obj) => {
        Object.entries(obj || {}).forEach(([key, value]) => {
            const input = form.querySelector(`[name="${key}"]`);
            if (!input) return;
            if (input.type === 'checkbox') {
                input.checked = Boolean(value);
            } else {
                input.value = value ?? '';
            }
        });
    };

    const renderFreeFeatures = (selected = []) => {
        const box = document.getElementById('freeFeaturesCheckboxes');
        if (!box) return;
        const lang = PosApi.getLang();
        box.innerHTML = featuresCatalog
            .map(
                (f) => `
            <div class="col-md-4 col-sm-6">
                <div class="form-check">
                    <input class="form-check-input free-feature-cb" type="checkbox" value="${f.key}" id="free_${f.key.replace(/\./g, '_')}" ${selected.includes(f.key) ? 'checked' : ''}>
                    <label class="form-check-label" for="free_${f.key.replace(/\./g, '_')}">${f.title?.[lang] || f.title?.ar || f.key}</label>
                </div>
            </div>`
            )
            .join('');
    };

    const loadSettings = async () => {
        const res = await PosApi.request('/settings');
        if (res.key !== 'success') {
            PosApi.showAlert(alertEl, res.message);
            return;
        }
        settingsCache = res.data;
        featuresCatalog = res.data.featuresCatalog || [];

        document.querySelectorAll('.settings-form').forEach((form) => {
            const key = form.dataset.key;
            if (key === 'subscription') {
                const sub = settingsCache.subscription || {};
                renderFreeFeatures(sub.freeAccessFeatures || []);
                const arInput = form.querySelector('[name="lockedMessageAr"]');
                if (arInput) {
                    arInput.value = sub.lockedMessage?.ar || sub.lockedMessageAr || '';
                }
            } else {
                objectToForm(form, settingsCache[key]);
            }
        });
    };

    document.querySelectorAll('.settings-form').forEach((form) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            PosApi.hideAlert(alertEl);
            const key = form.dataset.key;
            let value = formToObject(form);

            if (key === 'subscription') {
                value = {
                    freeAccessFeatures: [...document.querySelectorAll('.free-feature-cb:checked')].map(
                        (cb) => cb.value
                    ),
                    lockedMessage: {
                        ar: form.querySelector('[name="lockedMessageAr"]')?.value || '',
                        en: form.querySelector('[name="lockedMessageAr"]')?.value || '',
                    },
                };
            }

            const res = await PosApi.request('/settings', {
                method: 'PUT',
                body: JSON.stringify({ key, value }),
            });

            if (res.key === 'success') {
                PosApi.showAlert(alertEl, res.message, 'success');
                settingsCache[key] = value;
            } else {
                PosApi.showAlert(alertEl, res.message);
            }
        });
    });

    loadSettings();

    window.onAdminLangChange = () => {
        const sub = settingsCache.subscription || {};
        renderFreeFeatures(sub.freeAccessFeatures || []);
    };
});
