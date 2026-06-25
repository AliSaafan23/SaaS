const MerchantI18n = {
    LANG_KEY: 'merchant-lang',
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

    async load(lang) {
        const l = this.setLang(lang);
        const res = await fetch(`/merchant/json/locales/${l}.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Locale load failed: ${l}`);
        this.dict = await res.json();
        this.ready = true;
        this.applyDocumentLang(l);
        return l;
    },

    apply(root = document) {
        root.querySelectorAll('[data-i18n-welcome]').forEach((el) => {
            const name = el.dataset.welcomeName || this.t('common.merchant', 'Merchant');
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
    },

    bindLangSwitcher() {
        document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const lang = btn.dataset.langBtn;
                if (!lang || lang === this.getLang()) return;
                await this.load(lang);
                this.apply();
                document.dispatchEvent(new CustomEvent('merchant:langchange', { detail: { lang } }));
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

MerchantI18n.bootstrapSync();
window.MerchantI18n = MerchantI18n;
