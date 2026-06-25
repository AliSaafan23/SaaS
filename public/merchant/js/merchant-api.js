const MerchantApi = {
    base: '/merchant',
    THEME_KEY: 'merchant-theme',
    _dialogResolve: null,

    getLang() {
        return window.MerchantI18n?.getLang?.() || 'ar';
    },

    t(key, fallback = '') {
        return window.MerchantI18n?.t?.(key, fallback) || fallback || key;
    },

    tpl(key, vars = {}, fallback = '') {
        let text = this.t(key, fallback);
        Object.entries(vars).forEach(([k, v]) => {
            text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v ?? '');
        });
        return text;
    },

    formatNum(n) {
        const v = Number(n);
        if (!Number.isFinite(v)) return '0';
        return new Intl.NumberFormat(this.getLang() === 'en' ? 'en-US' : 'ar-EG').format(v);
    },

    formatMoney(n) {
        const cur = this.t('currency', 'EGP');
        return `${this.formatNum(n)} ${cur}`;
    },

    async request(path, options = {}) {
        const res = await fetch(`${this.base}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                lang: this.getLang(),
                ...(options.headers || {}),
            },
            ...options,
        });

        let data;
        try {
            data = await res.json();
        } catch {
            data = { success: false, key: 'fail', message: this.t('common.responseError', 'Response error') };
        }

        if (res.status === 401 && !options.skipRedirect) {
            window.location.href = '/merchant/login';
            return data;
        }

        return data;
    },

    async uploadForm(path, files = {}, options = {}) {
        const formData = new FormData();
        Object.entries(files).forEach(([key, value]) => {
            if (value != null) formData.append(key, value);
        });

        const res = await fetch(`${this.base}${path}`, {
            credentials: 'include',
            method: options.method || 'POST',
            headers: {
                Accept: 'application/json',
                lang: this.getLang(),
                ...(options.headers || {}),
            },
            body: formData,
        });

        let data;
        try {
            data = await res.json();
        } catch {
            data = { success: false, key: 'fail', message: this.t('common.responseError', 'Response error') };
        }

        if (res.status === 401 && !options.skipRedirect) {
            window.location.href = '/merchant/login';
        }

        return data;
    },

    isSuccess(res) {
        return res?.key === 'success' || res?.success === true;
    },

    showAlert(el, message, type = 'danger') {
        if (!el) return;
        el.className = `alert alert-${type} pos-alert`;
        el.textContent = message;
        el.classList.remove('d-none');
    },

    hideAlert(el) {
        if (el) el.classList.add('d-none');
    },

    initDialog() {
        const root = document.getElementById('posDialogRoot');
        if (!root || root.dataset.bound) return;
        root.dataset.bound = '1';

        document.getElementById('posDialogConfirm')?.addEventListener('click', () => this._closeDialog(true));
        document.getElementById('posDialogCancel')?.addEventListener('click', () => this._closeDialog(false));
        root.querySelector('.pos-dialog-backdrop')?.addEventListener('click', () => {
            if (root.classList.contains('is-alert')) this._closeDialog(true);
            else this._closeDialog(false);
        });

        document.addEventListener('keydown', (e) => {
            if (root.hidden) return;
            if (e.key === 'Escape') this._closeDialog(root.classList.contains('is-alert'));
        });
    },

    _dialogIcons: {
        confirm: 'fa-question-circle',
        danger: 'fa-exclamation-triangle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        error: 'fa-times-circle',
    },

    _openDialog({ mode, title, message, confirmText, cancelText, variant, type }) {
        this.initDialog();
        const root = document.getElementById('posDialogRoot');
        if (!root) return Promise.resolve(mode === 'alert');

        const iconEl = document.getElementById('posDialogIcon');
        const titleEl = document.getElementById('posDialogTitle');
        const messageEl = document.getElementById('posDialogMessage');
        const confirmBtn = document.getElementById('posDialogConfirm');
        const cancelBtn = document.getElementById('posDialogCancel');

        const isAlert = mode === 'alert';
        const visual = variant || type || (isAlert ? 'info' : 'confirm');

        root.className = 'pos-dialog-root';
        root.classList.add(isAlert ? 'is-alert' : 'is-confirm');
        if (['danger', 'success', 'warning', 'info'].includes(visual)) {
            root.classList.add(`is-${visual}`);
        }

        const iconClass = this._dialogIcons[visual] || this._dialogIcons.confirm;
        if (iconEl) iconEl.innerHTML = `<i class="fas ${iconClass}"></i>`;

        if (titleEl) titleEl.textContent = title || this.t(isAlert ? 'dialog.alertTitle' : 'dialog.confirmTitle');
        if (messageEl) messageEl.textContent = message || '';

        if (confirmBtn) {
            confirmBtn.textContent = confirmText || (isAlert ? this.t('dialog.ok') : this.t('dialog.confirm'));
            confirmBtn.classList.toggle('btn-danger', visual === 'danger' && !isAlert);
            confirmBtn.classList.toggle('btn-pos-primary', visual !== 'danger' || isAlert);
        }
        if (cancelBtn) cancelBtn.textContent = cancelText || this.t('common.cancel');

        root.hidden = false;
        root.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        confirmBtn?.focus();

        return new Promise((resolve) => {
            this._dialogResolve = resolve;
        });
    },

    _closeDialog(result) {
        const root = document.getElementById('posDialogRoot');
        if (root) {
            root.hidden = true;
            root.setAttribute('aria-hidden', 'true');
        }
        document.body.style.overflow = '';
        if (this._dialogResolve) {
            const resolve = this._dialogResolve;
            this._dialogResolve = null;
            resolve(result);
        }
    },

    confirm({
        title,
        message = '',
        confirmText,
        cancelText,
        variant = 'confirm',
    } = {}) {
        return this._openDialog({
            mode: 'confirm',
            title: title ?? this.t('dialog.confirmTitle'),
            message,
            confirmText: confirmText ?? this.t('dialog.confirm'),
            cancelText: cancelText ?? this.t('common.cancel'),
            variant,
        });
    },

    notify({
        title,
        message = '',
        type = 'info',
        buttonText,
    } = {}) {
        const map = { error: 'danger', fail: 'danger', danger: 'danger', success: 'success', warning: 'warning', info: 'info' };
        const titles = {
            danger: this.t('dialog.errorTitle'),
            success: this.t('dialog.successTitle'),
            warning: this.t('dialog.warningTitle'),
            info: this.t('dialog.alertTitle'),
        };
        const visual = map[type] || type;
        return this._openDialog({
            mode: 'alert',
            title: title ?? titles[visual] ?? this.t('dialog.alertTitle'),
            message,
            type: visual,
            confirmText: buttonText ?? this.t('dialog.ok'),
        });
    },

    toast(message, type = 'info', { title = '', duration = 4200 } = {}) {
        const host = document.getElementById('posToastHost');
        if (!host || !message) return;

        const map = { error: 'danger', fail: 'danger', danger: 'danger', success: 'success', warning: 'warning' };
        const visual = map[type] || type;
        const icons = { success: 'fa-check', danger: 'fa-times', warning: 'fa-exclamation', info: 'fa-info' };

        const el = document.createElement('div');
        el.className = `pos-toast ${visual}`;
        el.innerHTML = `
            <div class="pos-toast-icon"><i class="fas ${icons[visual] || icons.info}"></i></div>
            <div class="pos-toast-body">
                ${title ? `<div class="pos-toast-title">${title}</div>` : ''}
                <div class="pos-toast-message">${message}</div>
            </div>`;
        host.appendChild(el);

        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-6px)';
            el.style.transition = 'opacity 0.2s, transform 0.2s';
            setTimeout(() => el.remove(), 220);
        }, duration);
    },

    statusBadge(status) {
        const label = this.t(`status.${status}`, status);
        const map = {
            active: 'success',
            pending: 'warning',
            block: 'warning',
            inactive: 'secondary',
            delete: 'danger',
        };
        const cls = map[status] || 'secondary';
        return `<span class="badge rounded-pill text-bg-${cls}">${label}</span>`;
    },

    formatDate(d) {
        if (!d) return '—';
        const locale = this.getLang() === 'en' ? 'en-US' : 'ar-EG';
        return new Date(d).toLocaleDateString(locale, { dateStyle: 'medium' });
    },

    billingLabel(cycle) {
        return this.t(`billing.${cycle}`, cycle);
    },

    lifetimeLabel() {
        return this.t('billing.lifetime', 'Lifetime');
    },

    initNavGroups() {
        document.querySelectorAll('.pos-nav-group-toggle').forEach((btn) => {
            btn.addEventListener('click', () => {
                const group = btn.closest('.pos-nav-group');
                group?.classList.toggle('open');
                btn.setAttribute('aria-expanded', group?.classList.contains('open') ? 'true' : 'false');
            });
        });
    },
};

document.addEventListener('DOMContentLoaded', () => {
    MerchantApi.initDialog();

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await MerchantApi.request('/auth/signout', { method: 'POST' });
        window.location.href = '/merchant/login';
    });

    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.querySelector('.pos-app')?.classList.toggle('sidebar-open');
    });

    MerchantApi.initNavGroups();
});

document.addEventListener('merchant:langchange', () => {
    if (typeof window.onMerchantLangChange === 'function') {
        window.onMerchantLangChange();
    }
});

window.MerchantApi = MerchantApi;
