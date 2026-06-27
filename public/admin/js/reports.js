document.addEventListener('DOMContentLoaded', () => {
    const t = (k, f) => (window.AdminI18n?.t?.(k, f) || f || k);
    const money = (n) => (window.PosApi ? PosApi.formatMoney(n) : Number(n || 0).toFixed(2));
    const num = (n) => Number(n || 0).toLocaleString(window.PosApi ? PosApi.localeTag() : 'en-US');
    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
    const charts = {};

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    /* ---------------- KPIs ---------------- */
    const renderKpis = (k = {}) => {
        setText('repRevenue', money(k.recognizedRevenue));
        setText('repInvoiced', money(k.totalInvoiced));
        setText('repCollected', money(k.totalCollected));
        setText('repRateText', `${k.collectionRate || 0}%`);
        setText('repChipRate', `${k.collectionRate || 0}%`);
        setText('repOutstanding', money(k.outstanding));
        setText('repOpenInv', num(k.openInvoicesCount));
        setText('repChipDebtors', `${num(k.debtorsCount)} ${t('reports.kpiDebtors', '')}`.trim());
        setText('repDeferred', money(k.deferredRevenue));
        setText('repCash', money(k.cash));
    };

    /* ---------------- Trend chart (invoiced vs collected) ---------------- */
    const renderTrend = (trend = {}) => {
        const el = document.getElementById('reportTrendChart');
        if (!el || typeof Chart === 'undefined') return;
        charts.trend?.destroy();
        const ctx = el.getContext('2d');
        const gA = ctx.createLinearGradient(0, 0, 0, 300);
        gA.addColorStop(0, 'rgba(99,102,241,.35)');
        gA.addColorStop(1, 'rgba(99,102,241,0)');
        const gridC = isDark() ? '#232d42' : '#eef2f7';
        const tickC = isDark() ? '#6b7890' : '#94a3b8';
        charts.trend = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: trend.labels || [],
                datasets: [
                    {
                        type: 'line',
                        label: t('reports.seriesInvoiced', 'Invoiced'),
                        data: trend.invoiced || [],
                        borderColor: '#6366f1',
                        backgroundColor: gA,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        order: 1,
                    },
                    {
                        type: 'bar',
                        label: t('reports.seriesCollected', 'Collected'),
                        data: trend.collected || [],
                        backgroundColor: 'rgba(34,197,94,.85)',
                        borderRadius: 8,
                        maxBarThickness: 26,
                        order: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8, color: tickC, font: { size: 12 } },
                    },
                    tooltip: {
                        backgroundColor: isDark() ? '#1b2436' : '#0f172a',
                        padding: 12,
                        cornerRadius: 12,
                        callbacks: { label: (c) => `${c.dataset.label}: ${num(c.parsed.y)}` },
                    },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: tickC, font: { size: 11 } } },
                    y: { grid: { color: gridC }, ticks: { color: tickC, font: { size: 11 }, maxTicksLimit: 5 }, border: { display: false } },
                },
                animation: { duration: 900, easing: 'easeOutQuart' },
            },
        });
    };

    /* ---------------- Debtors doughnut ---------------- */
    const renderDebtorsChart = (debtors = []) => {
        const el = document.getElementById('reportDebtorsChart');
        if (!el || typeof Chart === 'undefined') return;
        charts.debtors?.destroy();
        const top = debtors.slice(0, 6);
        const palette = ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#0ea5e9', '#14b8a6'];
        const others = debtors.slice(6).reduce((s, d) => s + d.outstanding, 0);
        const labels = top.map((d) => d.name || '—');
        const data = top.map((d) => d.outstanding);
        if (others > 0) { labels.push(t('reports.all', 'Others')); data.push(Math.round(others)); }

        const ctx = el.getContext('2d');
        charts.debtors = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: palette,
                    borderWidth: 2,
                    borderColor: isDark() ? '#141b2d' : '#fff',
                    hoverOffset: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8, padding: 12, color: isDark() ? '#6b7890' : '#64748b', font: { size: 11 } },
                    },
                    tooltip: {
                        backgroundColor: isDark() ? '#1b2436' : '#0f172a',
                        padding: 12,
                        cornerRadius: 12,
                        callbacks: { label: (c) => `${c.label}: ${money(c.parsed)}` },
                    },
                },
                animation: { duration: 900 },
            },
        });
    };

    /* ---------------- Debtors list ---------------- */
    const renderDebtorsList = (debtors = []) => {
        const host = document.getElementById('repDebtorsList');
        if (!host) return;
        if (!debtors.length) {
            host.innerHTML = `<div class="saas-empty"><i class="fas fa-circle-check"></i><div>${t('reports.noDebtors', 'No outstanding receivables')}</div></div>`;
            return;
        }
        const max = Math.max(...debtors.map((d) => d.outstanding), 1);
        host.innerHTML = debtors.slice(0, 8).map((d) => {
            const pct = Math.max(6, Math.round((d.outstanding / max) * 100));
            const av = d.avatar
                ? `<img src="${d.avatar}" alt="">`
                : '<i class="fas fa-user"></i>';
            return `<div class="rep-debtor">
                <span class="rep-debtor__av">${av}</span>
                <div class="rep-debtor__body">
                    <div class="rep-debtor__name">${d.name || '—'}</div>
                    <div class="rep-debtor__bar"><span style="width:${pct}%"></span></div>
                </div>
                <div class="rep-debtor__amt">
                    <b>${money(d.outstanding)}</b>
                    <small>${d.openCount} ${t('reports.openInvoices', '')}</small>
                </div>
            </div>`;
        }).join('');
    };

    /* ---------------- Transactions ledger ---------------- */
    const custCell = (name, avatar) =>
        `<span class="rep-cust"><span class="rep-cust__av">${
            avatar ? `<img src="${avatar}" alt="">` : '<i class="fas fa-user"></i>'
        }</span>${name || '—'}</span>`;

    const renderLedger = (rows = []) => {
        const tbody = document.querySelector('#repLedgerTable tbody');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="4"><div class="saas-empty"><i class="fas fa-receipt"></i><div>${t('reports.noTransactions', 'No transactions yet')}</div></div></td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map((r) => {
            const isPay = r.kind === 'payment';
            const typeLabel = isPay ? t('reports.txPayment', 'Payment') : t('reports.txInvoice', 'Invoice');
            const icon = isPay ? 'fa-hand-holding-dollar' : 'fa-file-invoice';
            const amtCls = isPay ? 'rep-amt-in' : 'rep-amt-out';
            const sign = isPay ? '+ ' : '';
            return `<tr>
                <td>
                    <span class="rep-tx-type ${r.kind}"><i class="fas ${icon}"></i>${typeLabel}</span>
                    <div style="font-size:.7rem;color:var(--sp-muted);margin-top:.15rem">${r.reference}</div>
                </td>
                <td>${custCell(r.customerName, r.customerAvatar)}</td>
                <td><span class="${amtCls}">${sign}${money(r.amount)}</span></td>
                <td style="white-space:nowrap">${r.date || '—'}</td>
            </tr>`;
        }).join('');
    };

    /* ---------------- Date filter ---------------- */
    const range = { from: null, to: null };

    const pad = (n) => String(n).padStart(2, '0');
    const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const presetRange = (preset) => {
        const now = new Date();
        if (preset === 'month') {
            return { from: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmtDate(now) };
        }
        if (preset === 'quarter') {
            return { from: fmtDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: fmtDate(now) };
        }
        if (preset === 'year') {
            return { from: fmtDate(new Date(now.getFullYear(), 0, 1)), to: fmtDate(now) };
        }
        return { from: null, to: null }; // all
    };

    const updateRangeBadge = () => {
        const badge = document.getElementById('repRangeBadge');
        if (!badge) return;
        badge.textContent = range.from
            ? `${range.from} → ${range.to || ''}`
            : t('reports.upToToday', 'كل البيانات حتى اليوم');
    };

    const buildQuery = (extra = '') => {
        const params = new URLSearchParams();
        if (range.from) params.set('from', range.from);
        if (range.to) params.set('to', range.to);
        const qs = params.toString();
        return `${qs ? `?${qs}` : ''}${qs ? (extra ? `&${extra}` : '') : (extra ? `?${extra}` : '')}`;
    };

    /* ---------------- Loaders ---------------- */
    const loadDashboard = async () => {
        document.getElementById('repTrendLoading')?.classList.remove('d-none');
        document.getElementById('repDebtorsLoading')?.classList.remove('d-none');
        const res = await PosApi.request(`/reports/dashboard${buildQuery()}`);
        document.getElementById('repTrendLoading')?.classList.add('d-none');
        document.getElementById('repDebtorsLoading')?.classList.add('d-none');
        if (!res.success) {
            PosApi.toast?.(res.message, 'error');
            return;
        }
        const d = res.data || {};
        renderKpis(d.kpis);
        renderTrend(d.trend);
        renderDebtorsChart(d.debtors || []);
        renderDebtorsList(d.debtors || []);
        updateRangeBadge();
    };

    const loadLedger = async () => {
        const res = await PosApi.request(`/reports/transactions${buildQuery('limit=60')}`);
        if (!res.success) return;
        renderLedger(res.data || []);
    };

    const reloadAll = () => { loadDashboard(); loadLedger(); };

    const bindFilter = () => {
        const tabs = document.querySelectorAll('#repFilterTabs .sp-chart-tab');
        const custom = document.getElementById('repFilterCustom');
        tabs.forEach((btn) => {
            btn.addEventListener('click', () => {
                tabs.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                const preset = btn.dataset.range;
                custom?.classList.toggle('d-none', preset !== 'custom');
                if (preset === 'custom') return; // wait for Apply
                Object.assign(range, presetRange(preset));
                reloadAll();
            });
        });
        document.getElementById('repApply')?.addEventListener('click', () => {
            const from = document.getElementById('repFrom')?.value;
            const to = document.getElementById('repTo')?.value;
            if (!from || !to) {
                PosApi.toast?.(t('home.pickDateRange', 'اختر تاريخ البداية والنهاية'), 'warning');
                return;
            }
            range.from = from;
            range.to = to;
            reloadAll();
        });
    };

    /* ---------------- Accounting tools (tabbed) ---------------- */
    const today = () => fmtDate(new Date());
    const monthStart = () => fmtDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

    const ReportTools = {
        renderIncome(data = {}) {
            const revenue = data.subscriptionRevenue ?? 0;
            const from = data.from || '—';
            const to = data.to || '—';
            return `<div class="acct-income-hero">
                <div class="acct-income-hero__icon"><i class="fas fa-chart-line"></i></div>
                <div>
                    <div class="acct-income-hero__label">${t('reports.subscriptionRevenue')}</div>
                    <div class="acct-income-hero__value">${money(revenue)}</div>
                    <div class="acct-income-hero__meta"><i class="fas fa-calendar-alt"></i> ${from} → ${to}</div>
                </div>
            </div>`;
        },

        renderBalance(data = {}) {
            const rows = [
                { icon: 'fa-wallet', accent: '#10b981', label: t('reports.cash'), value: Number(data.cash || 0) },
                { icon: 'fa-hand-holding-dollar', accent: '#6366f1', label: t('reports.ar'), value: Number(data.accountsReceivable || 0) },
                { icon: 'fa-hourglass-half', accent: '#f59e0b', label: t('reports.deferred'), value: Number(data.deferredRevenue || 0) },
            ];
            const total = rows.reduce((s, r) => s + Math.abs(r.value), 0) || 1;
            const cards = rows.map((r) => {
                const pct = Math.round((Math.abs(r.value) / total) * 100);
                return `<div class="acct-bal-card" style="--acct-accent:${r.accent}">
                    <div class="acct-bal-card__head">
                        <span class="acct-bal-card__ico"><i class="fas ${r.icon}"></i></span>
                        <span class="acct-bal-card__name">${r.label}</span>
                    </div>
                    <div class="acct-bal-card__val">${money(r.value)}</div>
                    <div class="acct-bal-card__bar"><span style="width:${pct}%"></span></div>
                </div>`;
            }).join('');
            const assetsTotal = Number(data.cash || 0) + Number(data.accountsReceivable || 0);
            return `<div class="acct-bal-meta" style="font-size:.78rem;color:var(--sp-muted);margin-bottom:.75rem">
                <i class="fas fa-calendar-check"></i> ${t('reports.asOf')}: <strong style="color:var(--sp-text)">${data.asOf || '—'}</strong>
            </div>
            <div class="acct-bal-grid">${cards}</div>
            <div class="acct-bal-total">
                <span>${t('reports.totalAssets')}</span>
                <strong>${money(assetsTotal)}</strong>
            </div>`;
        },

        renderRevenue(data, message) {
            const count = data?.count ?? (Array.isArray(data) ? data.length : 0);
            return `<div class="acct-result-banner acct-result-banner--ok">
                <i class="fas fa-check-circle"></i>
                <div>
                    <strong>${message || t('reports.revenueDone')}</strong>
                    <p>${t('reports.revenueCount')}: <span class="saas-badge saas-badge--success">${count}</span></p>
                </div>
            </div>`;
        },

        renderError(msg) {
            return `<div class="acct-result-banner acct-result-banner--err">
                <i class="fas fa-exclamation-circle"></i>
                <div><strong>${t('common.error')}</strong><p>${msg}</p></div>
            </div>`;
        },
    };

    const setAcctLoading = (el, on) => el?.classList.toggle('is-loading', on);

    const runReport = async (form, containerId, fetcher, renderer, after) => {
        const container = document.getElementById(containerId);
        if (!form || !container) return;
        const btn = form.querySelector('[type="submit"]');
        setAcctLoading(container, true);
        if (btn) btn.disabled = true;
        try {
            const res = await fetcher(new FormData(form));
            if (!res.success) {
                container.innerHTML = ReportTools.renderError(res.message || PosApi.t('common.responseError'));
                return;
            }
            container.innerHTML = renderer(res.data, res.message);
            after?.(res);
        } finally {
            setAcctLoading(container, false);
            if (btn) btn.disabled = false;
        }
    };

    const initAcctDates = () => {
        const incomeForm = document.getElementById('incomeForm');
        const balanceForm = document.getElementById('balanceForm');
        const revenueForm = document.getElementById('revenueForm');
        if (incomeForm) {
            incomeForm.querySelector('[name="from"]').value = monthStart();
            incomeForm.querySelector('[name="to"]').value = today();
        }
        if (balanceForm) balanceForm.querySelector('[name="asOf"]').value = today();
        if (revenueForm) revenueForm.querySelector('[name="periodEnd"]').value = today();
    };

    const bindAcctTabs = () => {
        const tabs = document.querySelectorAll('#acctTabs .acct-tab');
        const panes = document.querySelectorAll('.acct-pane');
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const id = tab.dataset.tab;
                tabs.forEach((b) => b.classList.toggle('active', b === tab));
                panes.forEach((p) => p.classList.toggle('active', p.dataset.pane === id));
            });
        });
    };

    const incomeForm = document.getElementById('incomeForm');
    const balanceForm = document.getElementById('balanceForm');
    const revenueForm = document.getElementById('revenueForm');

    incomeForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        runReport(incomeForm, 'incomeResult', async (fd) => {
            const q = new URLSearchParams(fd).toString();
            return PosApi.request(`/reports/income-statement?${q}`);
        }, (data) => ReportTools.renderIncome(data));
    });

    balanceForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        runReport(balanceForm, 'balanceResult', async (fd) => {
            const q = new URLSearchParams(fd).toString();
            return PosApi.request(`/reports/balance-sheet?${q}`);
        }, (data) => ReportTools.renderBalance(data));
    });

    revenueForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        runReport(revenueForm, 'revenueResult', async (fd) => {
            const body = Object.fromEntries(fd.entries());
            return PosApi.request('/revenue-recognition/run', {
                method: 'POST',
                body: JSON.stringify(body),
            });
        }, (data, message) => ReportTools.renderRevenue(data, message), () => reloadAll());
    });

    const loadAcctDefaults = () => {
        incomeForm?.requestSubmit();
        balanceForm?.requestSubmit();
    };

    // Re-render charts on language switch so labels/legend follow locale.
    document.addEventListener('admin:langchange', () => {
        reloadAll();
        loadAcctDefaults();
    });

    bindFilter();
    bindAcctTabs();
    initAcctDates();
    SaasUI.initPage();
    reloadAll();
    loadAcctDefaults();
});
