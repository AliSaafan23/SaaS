document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#appInstallsTable tbody');
    const alertEl = document.getElementById('appInstallsAlert');
    const deviceFilter = document.getElementById('installDeviceFilter');
    const countryFilter = document.getElementById('installCountryFilter');
    const linkedFilter = document.getElementById('installLinkedFilter');
    const searchInput = document.getElementById('installSearch');

    let socket = null;
    let latestInstallId = 0;

    const emDash = () => PosApi.t('common.emDash', '—');

    const deviceLabel = (type) => {
        if (type === 'android') return PosApi.t('appInstalls.deviceAndroid', 'Android');
        if (type === 'ios') return PosApi.t('appInstalls.deviceIos', 'iOS');
        if (type === 'web') return PosApi.t('appInstalls.deviceDesktop', 'Desktop');
        return type || emDash();
    };

    const statusBadge = (row) => {
        if (row.isLinked) {
            const ref = row.linkedUserRef === 'Merchant' ? PosApi.t('appInstalls.linkedMerchant') : PosApi.t('appInstalls.linkedCashier');
            return `<span class="badge rounded-pill text-bg-success">${ref}</span>`;
        }
        return `<span class="badge rounded-pill text-bg-secondary">${PosApi.t('appInstalls.statusGuest')}</span>`;
    };

    const loadStats = async () => {
        const res = await PosApi.request('/app-installs/stats');
        if (res.key !== 'success') return;
        const s = res.data;
        document.getElementById('statInstallTotal').textContent = PosApi.formatNum(s.total);
        document.getElementById('statInstallAndroid').textContent = PosApi.formatNum(s.android);
        document.getElementById('statInstallIos').textContent = PosApi.formatNum(s.ios);
        document.getElementById('statInstallDesktop').textContent = PosApi.formatNum(s.desktop);
        document.getElementById('statInstallUnlinked').textContent = PosApi.formatNum(s.unlinked);
    };

    const loadCountryFilter = async () => {
        if (!countryFilter) return;
        const res = await PosApi.request('/countries/public');
        if (res.key !== 'success') return;
        const current = countryFilter.value;
        countryFilter.innerHTML = `<option value="">${PosApi.t('countries.filterAll')}</option>`;
        res.data.forEach((c) => {
            countryFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        if (current) countryFilter.value = current;
    };

    const buildQuery = () => {
        const params = new URLSearchParams();
        if (deviceFilter?.value) params.set('deviceType', deviceFilter.value);
        if (countryFilter?.value) params.set('countryId', countryFilter.value);
        if (linkedFilter?.value) params.set('linked', linkedFilter.value);
        if (searchInput?.value?.trim()) params.set('search', searchInput.value.trim());
        params.set('limit', '200');
        return params.toString() ? `?${params.toString()}` : '?limit=200';
    };

    const renderRows = (items) => {
        if (!items.length) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-muted">${PosApi.t('appInstalls.empty')}</td></tr>`;
            return;
        }

        tbody.innerHTML = items
            .map(
                (row) => `
            <tr data-id="${row.id}">
                <td>${row.id}</td>
                <td>
                    <strong>${deviceLabel(row.deviceType)}</strong>
                    ${row.deviceModel ? `<br><small class="text-muted">${row.deviceModel}</small>` : ''}
                    ${row.osVersion ? `<br><small class="text-muted">${row.osVersion}</small>` : ''}
                </td>
                <td><code class="small">${row.deviceId}</code></td>
                <td><small>${row.ipAddress || emDash()}</small></td>
                <td>
                    <small>${row.geo?.locationLabel || emDash()}</small>
                    ${row.geo?.network?.isp ? `<br><small class="text-muted">${row.geo.network.isp}</small>` : ''}
                </td>
                <td>${row.country?.name || emDash()}</td>
                <td>${row.appVersion || emDash()}</td>
                <td>${statusBadge(row)}</td>
                <td>${PosApi.formatDate(row.installedAt)}</td>
                <td>${PosApi.formatDate(row.lastSeenAt)}</td>
            </tr>`
            )
            .join('');

        latestInstallId = Math.max(latestInstallId, ...items.map((i) => i.id));
    };

    const loadInstalls = async () => {
        const res = await PosApi.request(`/app-installs${buildQuery()}`);
        if (res.key !== 'success') {
            PosApi.showAlert(alertEl, res.message);
            return;
        }
        PosApi.hideAlert(alertEl);
        renderRows(res.data.items || []);
    };

    const showNewInstallToast = (payload) => {
        const country = payload.country?.name || payload.geo?.locationLabel || emDash();
        const device = deviceLabel(payload.deviceType);
        PosApi.toast(
            PosApi.tpl('appInstalls.liveToast', {
                device,
                country,
                serial: payload.deviceId,
            }),
            'info',
            { title: PosApi.t('appInstalls.liveTitle'), duration: 8000 }
        );
        loadStats();
        loadInstalls();
    };

    const connectSocket = async () => {
        if (typeof io === 'undefined') return;

        try {
            const profile = await PosApi.request('/auth/profile');
            const token = profile?.data?.token;
            if (!token) return;

            socket = io({
                auth: { token },
                transports: ['websocket', 'polling'],
            });

            socket.on('appInstall', (payload) => {
                if (!payload?.isNew) return;
                showNewInstallToast(payload);
            });
        } catch (err) {
            console.warn('Socket connect failed:', err);
        }
    };

    deviceFilter?.addEventListener('change', loadInstalls);
    countryFilter?.addEventListener('change', loadInstalls);
    linkedFilter?.addEventListener('change', loadInstalls);

    let searchTimer;
    searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadInstalls, 350);
    });

    document.getElementById('refreshAppInstalls')?.addEventListener('click', () => {
        loadStats();
        loadInstalls();
    });

    loadCountryFilter();
    loadStats();
    loadInstalls();
    connectSocket();

    window.onAdminLangChange = () => {
        loadCountryFilter();
        loadStats();
        loadInstalls();
    };
});
