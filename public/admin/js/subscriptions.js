document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('planForm');
    const alertEl = document.getElementById('planFormAlert');
    const tbody = document.querySelector('#plansTable tbody');
    const cancelBtn = document.getElementById('cancelPlanEdit');
    const formTitle = document.getElementById('planFormTitle');
    const idInput = document.getElementById('planId');
    const platformFilter = document.getElementById('planPlatformFilter');
    const presetGrid = document.getElementById('planPresetGrid');
    const freeStrip = document.getElementById('planFreeFeaturesStrip');
    const tabsEl = document.getElementById('planFeatureTabs');
    const panelEl = document.getElementById('planFeatureGroups');
    const featuresCountEl = document.getElementById('planFeaturesCount');
    const billingCycleSelect = form?.querySelector('[name="billingCycle"]');
    const durationInput = form?.querySelector('[name="durationDays"]');
    const platformSelect = form?.querySelector('[name="platform"]');

    let featuresCatalog = [];
    let freeFeatureKeys = [];
    let paidFeatureKeys = [];
    let featureGroups = {};
    let featureGroupMeta = {};
    let planPresets = [];
    let activePresetId = null;
    let activeFeatureTab = 'all';
    let selectedFeatureKeys = new Set();

    const lang = () => PosApi.getLang();
    const loc = (obj, fallback = '') => obj?.[lang()] || obj?.ar || obj?.en || fallback;

    const groupOrder = () => {
        const order = ['sales', 'inventory', 'purchases', 'cashbox', 'reports'];
        return [...order, ...Object.keys(featureGroups).filter((g) => !order.includes(g))];
    };

    const resolvePresetFeatures = (preset) => {
        if (preset.features === 'all') return [...paidFeatureKeys];
        return (preset.features || []).filter((k) => paidFeatureKeys.includes(k));
    };

    const getSelectedFeatures = () => [...selectedFeatureKeys];

    const updateFeaturesCount = () => {
        const n = selectedFeatureKeys.size;
        if (featuresCountEl) {
            featuresCountEl.textContent =
                n === 0
                    ? PosApi.t('plans.featuresCountZero')
                    : PosApi.tpl('plans.featuresCountPaid', { count: n });
        }
    };

    const countSelectedInGroup = (groupKey) => {
        const keys = (featureGroups[groupKey] || []).map((f) => f.key);
        return keys.filter((k) => selectedFeatureKeys.has(k)).length;
    };

    const renderChip = (f) => {
        const on = selectedFeatureKeys.has(f.key);
        return `
            <button type="button" class="plan-feat-chip${on ? ' is-selected' : ''}" data-key="${f.key}">
                <i class="fas fa-check"></i>
                <span>${loc(f.title) || f.key}</span>
            </button>`;
    };

    const renderTabs = () => {
        if (!tabsEl) return;
        const groups = groupOrder().filter((g) => featureGroups[g]?.length);
        const totalSelected = getSelectedFeatures().length;
        const tabs = [
            `<button type="button" class="plan-feat-tab${activeFeatureTab === 'all' ? ' active' : ''}" data-tab="all">
                ${PosApi.t('plans.tabAll')} <span class="tab-count">${PosApi.tpl('plans.tabCount', { selected: totalSelected, total: paidFeatureKeys.length })}</span>
            </button>`,
            ...groups.map((g) => {
                const meta = featureGroupMeta[g] || { ar: g, en: g };
                const sel = countSelectedInGroup(g);
                const total = featureGroups[g].length;
                const groupName = loc(meta, g);
                return `<button type="button" class="plan-feat-tab${activeFeatureTab === g ? ' active' : ''}" data-tab="${g}">
                    ${groupName} <span class="tab-count">${PosApi.tpl('plans.tabCount', { selected: sel, total })}</span>
                </button>`;
            }),
        ];
        tabsEl.innerHTML = tabs.join('');
    };

    const renderPanel = () => {
        if (!panelEl) return;
        const selected = getSelectedFeatures();

        if (activeFeatureTab !== 'all') {
            const items = featureGroups[activeFeatureTab] || [];
            const meta = featureGroupMeta[activeFeatureTab] || { ar: activeFeatureTab, en: activeFeatureTab, icon: 'fa-layer-group' };
            const groupName = loc(meta, activeFeatureTab);
            panelEl.innerHTML = `
                <div class="plan-feat-section">
                    <div class="plan-feat-section-label">
                        <i class="fas ${meta.icon || 'fa-layer-group'}"></i>
                        ${PosApi.tpl('plans.tapHint', { group: groupName })}
                    </div>
                    <div class="plan-feat-chip-grid">${items.map(renderChip).join('')}</div>
                </div>`;
            return;
        }

        const sections = groupOrder()
            .filter((g) => featureGroups[g]?.length)
            .map((g) => {
                const meta = featureGroupMeta[g] || { ar: g, en: g, icon: 'fa-layer-group' };
                return `
                <div class="plan-feat-section" data-section="${g}">
                    <div class="plan-feat-section-label">
                        <i class="fas ${meta.icon || 'fa-layer-group'}"></i>
                        ${loc(meta, g)}
                    </div>
                    <div class="plan-feat-chip-grid">${featureGroups[g].map(renderChip).join('')}</div>
                </div>`;
            })
            .join('');

        panelEl.innerHTML = sections || `<p class="text-muted small mb-0">${PosApi.t('plans.noPaid')}</p>`;
        void selected;
    };

    const refreshFeatureUi = () => {
        renderTabs();
        renderPanel();
        updateFeaturesCount();
        document.querySelectorAll('.plan-preset-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.presetId === activePresetId);
        });
    };

    const setSelectedFeatures = (keys, presetId = null) => {
        selectedFeatureKeys = new Set(keys);
        activePresetId = presetId;
        refreshFeatureUi();
    };

    const detectActivePreset = () => {
        const selected = selectedFeatureKeys;
        if (!selected.size) {
            activePresetId = null;
            refreshFeatureUi();
            return;
        }
        const match = planPresets.find((p) => {
            const keys = resolvePresetFeatures(p);
            if (!keys.length || keys.length !== selected.size) return false;
            return keys.every((k) => selected.has(k));
        });
        activePresetId = match?.id || null;
        refreshFeatureUi();
    };

    const renderFreeStrip = () => {
        if (!freeStrip) return;
        const freeItems = featuresCatalog.filter((f) => freeFeatureKeys.includes(f.key));
        const names = freeItems.map((f) => loc(f.title) || f.key).join(' · ');
        freeStrip.innerHTML = freeItems.length
            ? `<i class="fas fa-gift"></i><span><strong>${PosApi.t('plans.alwaysFree')}</strong> — ${names}</span>`
            : '';
    };

    const renderPresets = () => {
        if (!presetGrid) return;
        presetGrid.innerHTML = planPresets
            .map(
                (p) => `
            <button type="button" class="plan-preset-btn" data-preset-id="${p.id}">
                <strong>${loc(p.title) || p.id}</strong>
                <small>${loc(p.hint)}</small>
            </button>`
            )
            .join('');
    };

    const initFeaturePicker = (selected = []) => {
        const keys = selected.includes('all') ? [...paidFeatureKeys] : selected;
        selectedFeatureKeys = new Set(keys.filter((k) => paidFeatureKeys.includes(k)));
        activeFeatureTab = 'all';
        activePresetId = null;
        renderFreeStrip();
        renderPresets();
        refreshFeatureUi();
        detectActivePreset();
    };

    const applyPlatformPresetHint = () => {
        if (!idInput.value && platformSelect?.value === 'mobile') {
            const mobilePreset = planPresets.find((p) => p.id === 'mobile_basic');
            if (mobilePreset) setSelectedFeatures(resolvePresetFeatures(mobilePreset), 'mobile_basic');
        }
    };

    const loadFeaturesCatalog = async () => {
        const res = await PosApi.request('/subscriptions/features/catalog');
        if (res.key !== 'success') return;
        featuresCatalog = res.data.featuresCatalog || [];
        freeFeatureKeys = res.data.freeFeatureKeys || [];
        paidFeatureKeys = res.data.paidFeatureKeys || [];
        featureGroups = res.data.featureGroups || {};
        featureGroupMeta = res.data.featureGroupMeta || {};
        planPresets = res.data.planFeaturePresets || [];
        initFeaturePicker();
    };

    const resetForm = () => {
        form.reset();
        idInput.value = '';
        document.getElementById('planIsActive').checked = true;
        form.durationDays.value = 30;
        form.maxBranches.value = 1;
        form.maxDevices.value = 1;
        formTitle.textContent = PosApi.t('plans.formAddTitle');
        cancelBtn.classList.add('d-none');
        initFeaturePicker([]);
        applyPlatformPresetHint();
    };

    billingCycleSelect?.addEventListener('change', () => {
        const cycle = billingCycleSelect.value;
        if (cycle === 'monthly') durationInput.value = 30;
        else if (cycle === 'annual') durationInput.value = 365;
        else if (cycle === 'lifetime') durationInput.value = 36500;
    });

    platformSelect?.addEventListener('change', () => {
        if (!idInput.value) applyPlatformPresetHint();
    });

    presetGrid?.addEventListener('click', (e) => {
        const btn = e.target.closest('.plan-preset-btn');
        if (!btn) return;
        const preset = planPresets.find((p) => p.id === btn.dataset.presetId);
        if (!preset) return;
        setSelectedFeatures(resolvePresetFeatures(preset), preset.id);
    });

    tabsEl?.addEventListener('click', (e) => {
        const tab = e.target.closest('.plan-feat-tab');
        if (!tab) return;
        activeFeatureTab = tab.dataset.tab;
        refreshFeatureUi();
    });

    panelEl?.addEventListener('click', (e) => {
        const chip = e.target.closest('.plan-feat-chip');
        if (!chip) return;
        const key = chip.dataset.key;
        if (selectedFeatureKeys.has(key)) selectedFeatureKeys.delete(key);
        else selectedFeatureKeys.add(key);
        detectActivePreset();
    });

    document.getElementById('selectAllPaidFeatures')?.addEventListener('click', () => {
        setSelectedFeatures([...paidFeatureKeys], 'full');
    });

    document.getElementById('clearPaidFeatures')?.addEventListener('click', () => {
        setSelectedFeatures([]);
    });

    const loadPlans = async () => {
        const pf = platformFilter?.value || '';
        const q = pf ? `?platform=${pf}&all=1` : '?all=1';
        const res = await PosApi.request(`/subscriptions${q}`);
        if (res.key !== 'success') {
            PosApi.showAlert(alertEl, res.message);
            return;
        }
        tbody.innerHTML = res.data
            .map(
                (p) => `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td><span class="badge text-bg-${p.platform === 'mobile' ? 'info' : 'primary'}">${PosApi.platformLabel(p.platform)}</span></td>
                <td>${PosApi.billingLabel(p.billingCycle)}</td>
                <td>${PosApi.formatMoney(p.price)}</td>
                <td><small>${PosApi.tpl('plans.limits', { branches: p.maxBranches ?? 1, cashiers: p.maxDevices ?? 1 })}</small></td>
                <td>${p.isActive ? PosApi.statusBadge('active') : PosApi.statusBadge('disabled')}</td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-outline-primary edit-plan" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-plan" data-id="${p.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`
            )
            .join('');
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        PosApi.hideAlert(alertEl);
        const fd = new FormData(form);
        const selected = getSelectedFeatures();
        const payload = {
            name: { ar: fd.get('nameAr'), en: fd.get('nameEn') || fd.get('nameAr') },
            description: {
                ar: fd.get('descriptionAr') || '',
                en: fd.get('descriptionEn') || fd.get('descriptionAr') || '',
            },
            platform: fd.get('platform'),
            billingCycle: fd.get('billingCycle'),
            price: Number(fd.get('price')),
            durationDays: Number(fd.get('durationDays')),
            maxProducts: Number(fd.get('maxProducts')),
            maxDevices: Number(fd.get('maxDevices')),
            maxBranches: Number(fd.get('maxBranches')),
            storageLimitMb: Number(fd.get('storageLimitMb')),
            features: selected.length === paidFeatureKeys.length && paidFeatureKeys.length ? ['all'] : selected,
            isActive: fd.get('isActive') === 'on',
        };

        const id = idInput.value;
        const res = await PosApi.request(id ? `/subscriptions/${id}` : '/subscriptions', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(payload),
        });

        if (res.key === 'success') {
            PosApi.showAlert(alertEl, res.message, 'success');
            resetForm();
            loadPlans();
        } else {
            PosApi.showAlert(alertEl, res.message);
        }
    });

    tbody?.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-plan');
        const delBtn = e.target.closest('.delete-plan');

        if (editBtn) {
            const res = await PosApi.request(`/subscriptions/${editBtn.dataset.id}`);
            if (res.key !== 'success') return PosApi.notify({ message: res.message, type: 'error' });
            const p = res.data;
            idInput.value = p.id;
            form.nameAr.value = p.nameRaw?.ar || p.name || '';
            form.nameEn.value = p.nameRaw?.en || '';
            form.descriptionAr.value = p.descriptionRaw?.ar || '';
            form.descriptionEn.value = p.descriptionRaw?.en || '';
            form.platform.value = p.platform || 'desktop';
            form.billingCycle.value = p.billingCycle || 'monthly';
            form.price.value = p.price;
            form.durationDays.value = p.durationDays;
            form.maxProducts.value = p.maxProducts;
            form.maxDevices.value = p.maxDevices ?? 1;
            form.maxBranches.value = p.maxBranches ?? 1;
            form.storageLimitMb.value = p.storageLimitMb;
            document.getElementById('planIsActive').checked = p.isActive;
            initFeaturePicker(p.features || []);
            formTitle.textContent = PosApi.t('plans.formEditTitle');
            cancelBtn.classList.remove('d-none');
            return;
        }

        if (delBtn) {
            const ok = await PosApi.confirm({
                title: PosApi.t('plans.deleteTitle'),
                message: PosApi.t('plans.deleteMessage'),
                confirmText: PosApi.t('dialog.deleteConfirm'),
                cancelText: PosApi.t('dialog.cancel'),
                variant: 'danger',
            });
            if (!ok) return;
            const res = await PosApi.request(`/subscriptions/${delBtn.dataset.id}`, { method: 'DELETE' });
            if (res.key === 'success') {
                PosApi.toast(res.message || PosApi.t('dialog.deleted'), 'success');
                loadPlans();
            } else PosApi.notify({ message: res.message, type: 'error' });
        }
    });

    cancelBtn?.addEventListener('click', resetForm);
    document.getElementById('refreshPlans')?.addEventListener('click', loadPlans);
    platformFilter?.addEventListener('change', loadPlans);

    loadFeaturesCatalog().then(() => {
        applyPlatformPresetHint();
        loadPlans();
    });

    window.onAdminLangChange = () => {
        renderFreeStrip();
        renderPresets();
        refreshFeatureUi();
        formTitle.textContent = idInput.value
            ? PosApi.t('plans.formEditTitle')
            : PosApi.t('plans.formAddTitle');
        loadPlans();
    };
});
