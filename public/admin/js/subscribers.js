document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#subscribersTable tbody');
    const paymentsTbody = document.querySelector('#pendingPaymentsTable tbody');
    const alertEl = document.getElementById('subscribersAlert');
    const filterEl = document.getElementById('subscriberFilter');
    const countryFilterEl = document.getElementById('subscriberCountryFilter');
    const activateModal = document.getElementById('activateModal');
    const activateModalBs = activateModal ? new bootstrap.Modal(activateModal) : null;
    const detailModal = document.getElementById('companyDetailModal');
    const detailModalBs = detailModal ? new bootstrap.Modal(detailModal) : null;

    const emDash = () => PosApi.t('common.emDash', '—');

    const subPlatformCell = (subs, platform) => {
        const sub = subs?.find((s) => s.platform === platform);
        if (!sub) return `<span class="text-muted">${emDash()}</span>`;
        return PosApi.statusBadge(sub.status);
    };

    const pendingPlanLabel = (row) => {
        if (!row.pendingPayment?.plan) return `<span class="text-muted">${emDash()}</span>`;
        const p = row.pendingPayment;
        const platform = PosApi.platformLabel(p.platform);
        return `<small>${p.plan.name}<br><span class="text-muted">${PosApi.formatMoney(p.amount)} — ${platform}</span></small>`;
    };

    const loadStats = async () => {
        const res = await PosApi.request('/subscribers/stats');
        if (res.key !== 'success') return;
        const s = res.data;
        document.getElementById('statTotalSubscribers').textContent = s.totalSubscribers ?? '0';
        document.getElementById('statActiveSubs').textContent = s.activeSubs ?? '0';
        const mrrEl = document.getElementById('statPlatformMrr');
        if (mrrEl) mrrEl.textContent = PosApi.formatMoney(s.subscriptionMrr);
        const brEl = document.getElementById('statPlatformBranches');
        if (brEl) brEl.textContent = PosApi.formatNum(s.totalBranches);
        const caEl = document.getElementById('statPlatformCashiers');
        if (caEl) caEl.textContent = PosApi.formatNum(s.totalCashiers);
        const devEl = document.getElementById('statPlatformDevices');
        if (devEl) devEl.textContent = PosApi.formatNum(s.totalActiveDevices);
    };

    const loadPlansForModal = async (preselectPlanId) => {
        const select = document.getElementById('activatePlanSelect');
        const res = await PosApi.request('/subscriptions?all=1');
        select.innerHTML = `<option value="">${PosApi.t('subscribers.selectPlan')}</option>`;
        if (res.key !== 'success') return;
        res.data
            .filter((p) => p.isActive)
            .forEach((p) => {
                const cycle = PosApi.billingLabel(p.billingCycle);
                const platform = PosApi.platformLabel(p.platform);
                const label = PosApi.tpl('subscribers.planOption', {
                    name: p.name,
                    platform,
                    price: PosApi.formatNum(p.price),
                    cycle,
                });
                select.innerHTML += `<option value="${p.id}">${label}</option>`;
            });
        if (preselectPlanId) select.value = String(preselectPlanId);
    };

    const openActivateModal = async (companyId, name, phone, pendingPayment) => {
        document.getElementById('activateCompanyId').value = companyId;
        document.getElementById('activatePaymentId').value = pendingPayment?.id || '';
        document.getElementById('activateCustomerInfo').textContent = `${name} — ${phone || ''}`;
        document.getElementById('activateNotes').value = pendingPayment?.merchantOrderId
            ? PosApi.tpl('subscribers.paymentRef', { ref: pendingPayment.merchantOrderId })
            : '';
        const refEl = document.getElementById('activatePaymentRef');
        if (refEl) {
            refEl.textContent = pendingPayment?.merchantOrderId
                ? PosApi.tpl('subscribers.paymentRefFull', {
                      ref: pendingPayment.merchantOrderId,
                      amount: PosApi.formatNum(pendingPayment.amount),
                  })
                : PosApi.t('subscribers.noPaymentRef');
        }
        const receiptWrap = document.getElementById('activateReceiptWrap');
        const receiptImg = document.getElementById('activateReceiptImg');
        const receiptLink = document.getElementById('activateReceiptLink');
        if (receiptWrap && receiptImg && receiptLink) {
            if (pendingPayment?.receiptUrl) {
                receiptWrap.classList.remove('d-none');
                receiptImg.src = pendingPayment.receiptUrl;
                receiptLink.href = pendingPayment.receiptUrl;
            } else {
                receiptWrap.classList.add('d-none');
                receiptImg.src = '';
                receiptLink.href = '#';
            }
        }
        const planId = pendingPayment?.plan?.id || pendingPayment?.subscriptionPlanId;
        await loadPlansForModal(planId);
        activateModalBs?.show();
    };

    const loadPendingPayments = async () => {
        if (!paymentsTbody) return;
        const res = await PosApi.request('/subscribers/payments/pending');
        if (res.key !== 'success') {
            paymentsTbody.innerHTML = `<tr><td colspan="7" class="text-muted">${PosApi.t('subscribers.loadPaymentsFailed')}</td></tr>`;
            return;
        }
        if (!res.data.length) {
            paymentsTbody.innerHTML = `<tr><td colspan="7" class="text-muted">${PosApi.t('subscribers.noPendingPayments')}</td></tr>`;
            return;
        }
        paymentsTbody.innerHTML = res.data
            .map((p) => {
                const date = PosApi.formatDate(p.createdAt);
                const platform = PosApi.platformLabel(p.platform);
                const receiptCell = p.receiptUrl
                    ? `<a href="${p.receiptUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-secondary"><i class="fas fa-image"></i> ${PosApi.t('subscribers.viewReceipt')}</a>`
                    : `<span class="badge text-bg-secondary">${PosApi.t('subscribers.noReceipt')}</span>`;
                return `
            <tr>
                <td><code>${p.merchantOrderId || emDash()}</code></td>
                <td>${p.companyName || emDash()}</td>
                <td>${p.plan?.name || emDash()}<br><small class="text-muted">${platform}</small></td>
                <td>${PosApi.formatMoney(p.amount)}</td>
                <td>${receiptCell}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-pos-primary activate-from-payment"
                        data-company-id="${p.companyId}"
                        data-payment-id="${p.id}"
                        data-plan-id="${p.subscriptionPlanId}"
                        data-name="${p.companyName || ''}"
                        data-phone=""
                        data-ref="${p.merchantOrderId || ''}"
                        data-amount="${p.amount}"
                        data-receipt-url="${p.receiptUrl || ''}">
                        <i class="fas fa-check"></i> ${PosApi.t('subscribers.confirmActivate')}
                    </button>
                </td>
            </tr>`;
            })
            .join('');
    };

    const loadCountryFilter = async () => {
        if (!countryFilterEl) return;
        const res = await PosApi.request('/countries/public');
        if (res.key !== 'success') return;
        const current = countryFilterEl.value;
        countryFilterEl.innerHTML = `<option value="">${PosApi.t('countries.filterAll')}</option>`;
        res.data.forEach((c) => {
            countryFilterEl.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        if (current) countryFilterEl.value = current;
    };

    const loadSubscribers = async () => {
        const params = new URLSearchParams();
        const filter = filterEl?.value || '';
        const countryId = countryFilterEl?.value || '';
        if (filter) params.set('filter', filter);
        if (countryId) params.set('countryId', countryId);
        const q = params.toString() ? `?${params.toString()}` : '';
        const res = await PosApi.request(`/subscribers/list${q}`);
        if (res.key !== 'success') {
            PosApi.showAlert(alertEl, res.message);
            return;
        }
        PosApi.hideAlert(alertEl);
        if (!res.data.length) {
            tbody.innerHTML = `<tr><td colspan="11" class="text-muted">${PosApi.t('subscribers.noCompanies')}</td></tr>`;
            return;
        }
        tbody.innerHTML = res.data
            .map((row) => {
                const m = row.metrics || {};
                const desktopActive = row.subscriptions?.some(
                    (s) => s.platform === 'desktop' && s.status === 'active'
                );
                const mobileActive = row.subscriptions?.some(
                    (s) => s.platform === 'mobile' && s.status === 'active'
                );
                return `
            <tr>
                <td>${row.id}</td>
                <td>
                    <strong>${row.name}</strong><br>
                    <small class="text-muted">${row.phone || emDash()}</small>
                </td>
                <td>${row.country?.name || emDash()}</td>
                <td>${PosApi.formatNum(m.branchCount)}</td>
                <td>${PosApi.formatNum(m.cashierCount)}</td>
                <td>${PosApi.formatNum(m.activeDeviceCount)}</td>
                <td>${PosApi.formatMoney(m.mrr)}</td>
                <td>${PosApi.statusBadge(row.status)}</td>
                <td>${subPlatformCell(row.subscriptions, 'desktop')}</td>
                <td>${subPlatformCell(row.subscriptions, 'mobile')}</td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-outline-primary view-company" data-company-id="${row.id}" title="${PosApi.t('subscribers.viewDetail')}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-pos-primary activate-sub"
                        data-company-id="${row.id}"
                        data-name="${row.name}"
                        data-phone="${row.phone || ''}"
                        data-payment-id="${row.pendingPayment?.id || ''}"
                        data-plan-id="${row.pendingPayment?.plan?.id || ''}"
                        data-ref="${row.pendingPayment?.merchantOrderId || ''}"
                        data-amount="${row.pendingPayment?.amount || ''}"
                        title="${PosApi.t('subscribers.activateTitle')}">
                        <i class="fas fa-check"></i>
                    </button>
                    ${desktopActive ? `<button class="btn btn-sm btn-outline-warning suspend-sub" data-company-id="${row.id}" data-platform="desktop" title="${PosApi.t('subscribers.suspendDesktop')}"><i class="fas fa-desktop"></i></button>` : ''}
                    ${mobileActive ? `<button class="btn btn-sm btn-outline-warning suspend-sub" data-company-id="${row.id}" data-platform="mobile" title="${PosApi.t('subscribers.suspendMobile')}"><i class="fas fa-mobile-alt"></i></button>` : ''}
                </td>
            </tr>`;
            })
            .join('');
    };

    const renderCompanyDetail = (d) => {
        const m = d.metrics || {};
        const subsHtml = (d.subscriptions || [])
            .map((s) => {
                const plan = s.plan;
                const limits = plan
                    ? `${PosApi.t('subscribers.colBranches')}: ${PosApi.tpl('subscribers.detailLimit', { used: m.branchCount, max: plan.maxBranches })} · ${PosApi.t('subscribers.colCashiers')}: ${PosApi.tpl('subscribers.detailLimit', { used: m.cashierCount, max: plan.maxDevices })}`
                    : '';
                return `<div class="border rounded p-2 mb-2">
                    <strong>${PosApi.platformLabel(s.platform)}</strong> — ${PosApi.statusBadge(s.status)}
                    <div class="small text-muted">${plan?.name || ''} · ${PosApi.formatMoney(plan?.price)} · MRR ${PosApi.formatMoney(s.monthlyMrr)}</div>
                    <div class="small">${limits}</div>
                </div>`;
            })
            .join('') || `<p class="text-muted small">${PosApi.t('common.noData')}</p>`;

        const branchesHtml = (d.branches || [])
            .map((b) => `<span class="badge rounded-pill text-bg-light text-dark me-1 mb-1">${b.name}</span>`)
            .join('') || `<span class="text-muted small">${PosApi.t('common.noData')}</span>`;

        const cashiersHtml = (d.cashiers || [])
            .map(
                (c) =>
                    `<tr><td>${c.name}</td><td>${c.branchName || emDash()}</td><td>${PosApi.formatNum(c.activeDevices)}</td><td>${PosApi.statusBadge(c.status)}</td></tr>`
            )
            .join('') || `<tr><td colspan="4" class="text-muted">${PosApi.t('common.noData')}</td></tr>`;

        const paymentsHtml = (d.recentPayments || [])
            .map(
                (p) =>
                    `<tr><td>${PosApi.formatMoney(p.amount)}</td><td>${PosApi.platformLabel(p.platform)}</td><td>${PosApi.statusBadge(p.status)}</td><td>${PosApi.formatDate(p.paidAt || p.createdAt)}</td></tr>`
            )
            .join('') || `<tr><td colspan="4" class="text-muted">${PosApi.t('common.noData')}</td></tr>`;

        return `
            <div class="mb-3">
                <h5 class="mb-1">${d.name}</h5>
                <p class="text-muted small mb-0">${d.phone || ''} ${d.address ? '· ' + d.address : ''}</p>
            </div>
            <div class="row g-3 mb-3">
                <div class="col-6 col-md-3"><div class="pos-stat-card p-2"><small class="text-muted">${PosApi.t('subscribers.colBranches')}</small><h5 class="mb-0">${PosApi.formatNum(m.branchCount)}</h5></div></div>
                <div class="col-6 col-md-3"><div class="pos-stat-card p-2"><small class="text-muted">${PosApi.t('subscribers.colCashiers')}</small><h5 class="mb-0">${PosApi.formatNum(m.cashierCount)}</h5></div></div>
                <div class="col-6 col-md-3"><div class="pos-stat-card p-2"><small class="text-muted">${PosApi.t('subscribers.colDevices')}</small><h5 class="mb-0">${PosApi.formatNum(m.activeDeviceCount)}</h5></div></div>
                <div class="col-6 col-md-3"><div class="pos-stat-card p-2"><small class="text-muted">${PosApi.t('subscribers.colMrr')}</small><h5 class="mb-0">${PosApi.formatMoney(m.mrr)}</h5></div></div>
            </div>
            <div class="row g-3 mb-3 small">
                <div class="col-md-4"><strong>${PosApi.t('subscribers.detailSalesMonth')}:</strong> ${PosApi.formatMoney(m.salesMonth)}</div>
                <div class="col-md-4"><strong>${PosApi.t('subscribers.detailSalesTotal')}:</strong> ${PosApi.formatMoney(m.salesTotal)}</div>
                <div class="col-md-4"><strong>${PosApi.t('subscribers.detailPaidTotal')}:</strong> ${PosApi.formatMoney(m.subscriptionPaidTotal)}</div>
            </div>
            <h6 class="mt-2">${PosApi.t('subscribers.detailSubscriptions')}</h6>
            ${subsHtml}
            <h6 class="mt-3">${PosApi.t('subscribers.detailBranches')}</h6>
            <div class="mb-3">${branchesHtml}</div>
            <h6>${PosApi.t('subscribers.detailCashiers')}</h6>
            <div class="table-responsive mb-3">
                <table class="table table-sm pos-table">
                    <thead><tr><th>${PosApi.t('common.name')}</th><th>${PosApi.t('common.branch')}</th><th>${PosApi.t('subscribers.colDevices')}</th><th>${PosApi.t('common.status')}</th></tr></thead>
                    <tbody>${cashiersHtml}</tbody>
                </table>
            </div>
            <h6>${PosApi.t('subscribers.detailPayments')}</h6>
            <div class="table-responsive">
                <table class="table table-sm pos-table">
                    <thead><tr><th>${PosApi.t('subscribers.colAmount')}</th><th>${PosApi.t('common.platform')}</th><th>${PosApi.t('common.status')}</th><th>${PosApi.t('subscribers.colDate')}</th></tr></thead>
                    <tbody>${paymentsHtml}</tbody>
                </table>
            </div>`;
    };

    const openCompanyDetail = async (companyId) => {
        const body = document.getElementById('companyDetailBody');
        if (!body) return;
        body.innerHTML = '<div class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm"></span></div>';
        detailModalBs?.show();
        const res = await PosApi.request(`/subscribers/company/${companyId}/detail`);
        if (res.key !== 'success') {
            body.innerHTML = `<p class="text-danger">${res.message}</p>`;
            return;
        }
        body.innerHTML = renderCompanyDetail(res.data);
    };

    tbody?.addEventListener('click', async (e) => {
        const viewBtn = e.target.closest('.view-company');
        const activateBtn = e.target.closest('.activate-sub');
        const suspendBtn = e.target.closest('.suspend-sub');

        if (viewBtn) {
            await openCompanyDetail(viewBtn.dataset.companyId);
            return;
        }

        if (activateBtn) {
            await openActivateModal(
                activateBtn.dataset.companyId,
                activateBtn.dataset.name,
                activateBtn.dataset.phone,
                activateBtn.dataset.paymentId
                    ? {
                          id: activateBtn.dataset.paymentId,
                          merchantOrderId: activateBtn.dataset.ref,
                          amount: activateBtn.dataset.amount,
                          plan: { id: activateBtn.dataset.planId },
                      }
                    : null
            );
            return;
        }

        if (suspendBtn) {
            const platform = PosApi.platformLabel(suspendBtn.dataset.platform);
            const ok = await PosApi.confirm({
                title: PosApi.t('subscribers.suspendTitle'),
                message: PosApi.tpl('subscribers.suspendMessage', { platform }),
                confirmText: PosApi.t('subscribers.suspendConfirm'),
                cancelText: PosApi.t('dialog.cancel'),
                variant: 'danger',
            });
            if (!ok) return;
            const res = await PosApi.request(
                `/subscribers/company/${suspendBtn.dataset.companyId}/suspend`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ platform: suspendBtn.dataset.platform }),
                }
            );
            if (res.key === 'success') {
                PosApi.toast(res.message, 'success', { title: PosApi.t('dialog.successTitle') });
                loadSubscribers();
                loadStats();
                loadPendingPayments();
            } else PosApi.notify({ message: res.message, type: 'error' });
        }
    });

    paymentsTbody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.activate-from-payment');
        if (!btn) return;
        await openActivateModal(btn.dataset.companyId, btn.dataset.name, btn.dataset.phone, {
            id: btn.dataset.paymentId,
            merchantOrderId: btn.dataset.ref,
            amount: btn.dataset.amount,
            subscriptionPlanId: btn.dataset.planId,
            receiptUrl: btn.dataset.receiptUrl || null,
            plan: { id: btn.dataset.planId },
        });
    });

    document.getElementById('confirmActivate')?.addEventListener('click', async () => {
        const companyId = document.getElementById('activateCompanyId').value;
        const subscriptionPlanId = document.getElementById('activatePlanSelect').value;
        const paymentId = document.getElementById('activatePaymentId').value;
        const notes = document.getElementById('activateNotes').value;
        if (!subscriptionPlanId) {
            return PosApi.notify({
                title: PosApi.t('dialog.alertTitle'),
                message: PosApi.t('subscribers.selectPlanWarning'),
                type: 'warning',
            });
        }

        const res = await PosApi.request(`/subscribers/company/${companyId}/activate`, {
            method: 'POST',
            body: JSON.stringify({
                subscriptionPlanId,
                notes,
                paymentId: paymentId || undefined,
            }),
        });

        if (res.key === 'success') {
            activateModalBs?.hide();
            PosApi.showAlert(alertEl, res.message, 'success');
            PosApi.toast(res.message, 'success', { title: PosApi.t('subscribers.activatedTitle') });
            loadSubscribers();
            loadStats();
            loadPendingPayments();
        } else {
            PosApi.notify({ message: res.message, type: 'error' });
        }
    });

    filterEl?.addEventListener('change', loadSubscribers);
    countryFilterEl?.addEventListener('change', loadSubscribers);
    document.getElementById('refreshSubscribers')?.addEventListener('click', () => {
        loadStats();
        loadSubscribers();
        loadPendingPayments();
    });

    loadCountryFilter();
    loadStats();
    loadSubscribers();
    loadPendingPayments();

    window.onAdminLangChange = () => {
        loadCountryFilter();
        loadStats();
        loadSubscribers();
        loadPendingPayments();
    };
});
