document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('paymentPendingContent');
    const alertEl = document.getElementById('pendingAlert');
    const t = (k, fb) => MerchantApi.t(k, fb);

    async function load() {
        const [statusRes, pendingRes] = await Promise.all([
            MerchantApi.request('/subscription/status'),
            MerchantApi.request('/subscription/pending-payment'),
        ]);

        if (statusRes.key !== 'success' || pendingRes.key !== 'success') {
            container.innerHTML = `<p class="text-danger">${t('paymentPending.loadFailed')}</p>`;
            return;
        }

        const active = (statusRes.data || []).find((s) => s.status === 'active');
        if (active) {
            window.location.href = '/merchant/home';
            return;
        }

        const pending = pendingRes.data?.pendingPayment;

        if (!pending) {
            container.innerHTML = `
                <div class="mpr-empty-state">
                    <i class="fas fa-receipt d-block"></i>
                    <p>${t('paymentPending.noPending')}</p>
                    <a href="/merchant/plans" class="btn btn-pos-primary">${t('paymentPending.choosePlan')}</a>
                </div>`;
            return;
        }

        const receiptBlock = pending.hasReceipt
            ? `
                <div class="mb-3">
                    <label class="form-label">${t('paymentPending.receiptUploaded')}</label>
                    <div class="border rounded p-2 bg-light">
                        <a href="${pending.receiptUrl}" target="_blank" rel="noopener">
                            <img src="${pending.receiptUrl}" alt="receipt" class="img-fluid rounded" style="max-height:220px">
                        </a>
                        <p class="small text-muted mb-0 mt-2">${t('paymentPending.receiptWaitingAdmin')}</p>
                    </div>
                </div>`
            : '';

        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-info-circle"></i>
                ${t('paymentPending.info')}
            </div>
            <dl class="row mb-0">
                <dt class="col-sm-4">${t('common.plan')}</dt>
                <dd class="col-sm-8">${pending.plan?.name || '—'}</dd>
                <dt class="col-sm-4">${t('common.platform')}</dt>
                <dd class="col-sm-8">${pending.platform}</dd>
                <dt class="col-sm-4">${t('common.price')}</dt>
                <dd class="col-sm-8">${pending.plan?.price || '—'} ${t('currency')}</dd>
                <dt class="col-sm-4">${t('common.status')}</dt>
                <dd class="col-sm-8">${MerchantApi.statusBadge(pending.status)}</dd>
                <dt class="col-sm-4">${t('paymentPending.paymentRef')}</dt>
                <dd class="col-sm-8"><code>${pending.merchantOrderId || '—'}</code></dd>
            </dl>
            <hr>
            <p class="text-muted small mb-3">${t('paymentPending.hint')}</p>
            ${receiptBlock}
            <form id="receiptUploadForm" class="mb-3">
                <label class="form-label" for="receiptFile">${t('paymentPending.uploadReceipt')}</label>
                <input type="file" class="form-control pos-input mb-2" id="receiptFile" name="receipt" accept="image/jpeg,image/png,image/webp,image/jpg">
                <button type="submit" class="btn btn-pos-primary btn-sm" id="uploadReceiptBtn">
                    <i class="fas fa-upload"></i> ${pending.hasReceipt ? t('paymentPending.replaceReceipt') : t('paymentPending.submitReceipt')}
                </button>
            </form>
            <div class="d-flex gap-2 flex-wrap">
                <a href="/merchant/plans" class="btn btn-outline-secondary btn-sm">${t('paymentPending.changePlan')}</a>
                <button type="button" class="btn btn-outline-primary btn-sm" id="refreshStatus">
                    <i class="fas fa-sync"></i> ${t('paymentPending.refreshStatus')}
                </button>
            </div>
        `;

        document.getElementById('refreshStatus')?.addEventListener('click', load);

        document.getElementById('receiptUploadForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            MerchantApi.hideAlert(alertEl);

            const fileInput = document.getElementById('receiptFile');
            const file = fileInput?.files?.[0];
            if (!file) {
                MerchantApi.showAlert(alertEl, t('paymentPending.receiptRequired'));
                return;
            }

            const btn = document.getElementById('uploadReceiptBtn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${t('common.loading')}`;
            }

            const res = await MerchantApi.uploadForm('/subscription/payment-receipt', { receipt: file });

            if (btn) btn.disabled = false;

            if (res.key === 'success') {
                MerchantApi.toast(t('paymentPending.receiptSuccess'), 'success');
                load();
                return;
            }

            MerchantApi.showAlert(alertEl, res.message || t('paymentPending.receiptFailed'));
            if (btn) {
                btn.innerHTML = `<i class="fas fa-upload"></i> ${pending.hasReceipt ? t('paymentPending.replaceReceipt') : t('paymentPending.submitReceipt')}`;
            }
        });
    }

    window.onMerchantLangChange = () => {
        MerchantI18n.apply();
        load();
    };

    load();
    setInterval(load, 45000);
});
