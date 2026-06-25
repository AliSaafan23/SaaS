const AdminI18n = {
    LANG_KEY: 'admin-lang',
    dict: {},
    ready: false,
    _initPromise: null,

    getLang() {
        const stored = localStorage.getItem(this.LANG_KEY);
        if (stored === 'en' || stored === 'ar') return stored;
        return 'ar';
    },

    setLang(lang) {
        const next = lang === 'en' ? 'en' : 'ar';
        localStorage.setItem(this.LANG_KEY, next);
        return next;
    },

    applyDocumentLang(lang) {
        const l = lang || this.getLang();
        document.documentElement.lang = l;
        document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    },

    t(key, fallback = '') {
        const parts = String(key).split('.');
        let node = this.dict;
        for (const p of parts) {
            if (node == null || typeof node !== 'object') return fallback || key;
            node = node[p];
        }
        return node ?? fallback ?? key;
    },

    tpl(key, vars = {}, fallback = '') {
        let text = this.t(key, fallback);
        Object.entries(vars).forEach(([k, v]) => {
            text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v ?? '');
        });
        return text;
    },

    async load(lang) {
        const l = this.setLang(lang);
        const res = await fetch(`/admin/json/locales/${l}.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Locale load failed: ${l}`);
        this.dict = await res.json();
        this.ready = true;
        this.applyDocumentLang(l);
        return l;
    },

    apply(root = document) {
        root.querySelectorAll('[data-i18n-welcome]').forEach((el) => {
            const name =
                el.dataset.welcomeName ||
                document.querySelector('.pos-user-profile strong')?.textContent?.trim() ||
                this.t('common.admin', 'Admin');
            el.textContent = this.tpl('dashboard.welcome', { name });
        });

        root.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            const val = this.t(key);
            if (val) el.textContent = val;
        });

        root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            const val = this.t(key);
            if (val) el.setAttribute('placeholder', val);
        });

        root.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            const val = this.t(key);
            if (val) el.setAttribute('title', val);
        });

        root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
            const key = el.getAttribute('data-i18n-aria');
            const val = this.t(key);
            if (val) el.setAttribute('aria-label', val);
        });

        const titleKey = document.body?.dataset?.pageTitleKey;
        if (titleKey) {
            const pageTitle = this.t(titleKey);
            const brand = this.t('common.brand');
            if (pageTitle) document.title = `${pageTitle} | ${brand}`;
        }

        root.querySelectorAll('[data-lang-btn]').forEach((btn) => {
            const active = btn.dataset.langBtn === this.getLang();
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        const lastUpdateEl = document.getElementById('navbarLastUpdate');
        if (lastUpdateEl?.dataset.timestamp) {
            const locale = this.getLang() === 'ar' ? 'ar-EG' : 'en-US';
            const dt = new Date(lastUpdateEl.dataset.timestamp).toLocaleString(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            lastUpdateEl.textContent = this.tpl('navbar.lastUpdate', { datetime: dt });
        }
    },

    bindLangSwitcher() {
        document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const lang = btn.dataset.langBtn;
                if (!lang || lang === this.getLang()) return;
                await this.load(lang);
                this.apply();
                document.dispatchEvent(new CustomEvent('admin:langchange', { detail: { lang } }));
            });
        });
    },

    bootstrapSync() {
        this.applyDocumentLang(this.getLang());
    },

    async init() {
        if (this._initPromise) return this._initPromise;
        this._initPromise = (async () => {
            this.bootstrapSync();
            await this.load(this.getLang());
            this.apply();
            this.bindLangSwitcher();
        })();
        return this._initPromise;
    },
};

AdminI18n.bootstrapSync();
window.AdminI18n = AdminI18n;
