/* SaaS Premium Shell — theme, sidebar, command palette, animations, charts */
const SaasShell = {
    init() {
        this.initTheme();
        this.initSidebar();
        this.initCommandPalette();
        this.initReveal();
        this.initCountUp();
        this.initProgress();
    },

    /* ---------------- Theme ---------------- */
    initTheme() {
        const apply = (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            document.querySelectorAll('#themeToggle i').forEach((i) => {
                i.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            });
        };
        const stored = localStorage.getItem('pos-theme')
            || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        apply(stored);

        document.getElementById('themeToggle')?.addEventListener('click', () => {
            const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            localStorage.setItem('pos-theme', next);
            apply(next);
        });
    },

    /* ---------------- Sidebar (mobile drawer) ---------------- */
    initSidebar() {
        const app = document.querySelector('.pos-app');
        const toggle = document.getElementById('sidebarToggle');
        const backdrop = document.getElementById('sidebarBackdrop');
        toggle?.addEventListener('click', () => app?.classList.toggle('sidebar-open'));
        backdrop?.addEventListener('click', () => app?.classList.remove('sidebar-open'));
    },

    /* ---------------- Command palette (Ctrl+K) ---------------- */
    commands: [
        { i18n: 'nav.overview', icon: 'fa-gauge-high', chip: 'pos-icon-blue', href: '/dashboard/home' },
        { i18n: 'nav.plans', icon: 'fa-layer-group', chip: 'pos-icon-violet', href: '/dashboard/ui/plans' },
        { i18n: 'nav.customers', icon: 'fa-users', chip: 'pos-icon-cyan', href: '/dashboard/ui/customers' },
        { i18n: 'nav.subscriptions', icon: 'fa-sync-alt', chip: 'pos-icon-indigo', href: '/dashboard/ui/subscriptions' },
        { i18n: 'nav.invoices', icon: 'fa-file-invoice-dollar', chip: 'pos-icon-amber', href: '/dashboard/ui/invoices' },
        { i18n: 'nav.payments', icon: 'fa-wallet', chip: 'pos-icon-green', href: '/dashboard/ui/payments' },
        { i18n: 'nav.reports', icon: 'fa-chart-line', chip: 'pos-icon-rose', href: '/dashboard/ui/reports' },
        { i18n: 'nav.users', icon: 'fa-user-shield', chip: 'pos-icon-indigo', href: '/dashboard/ui/users' },
        { i18n: 'nav.roles', icon: 'fa-shield-halved', chip: 'pos-icon-blue', href: '/dashboard/ui/roles' },
    ],

    initCommandPalette() {
        const t = (k, f) => (window.AdminI18n?.t?.(k, f) || f || k);
        const root = document.createElement('div');
        root.className = 'sp-cmdk';
        root.innerHTML = `
            <div class="sp-cmdk__panel" role="dialog" aria-modal="true">
                <div class="sp-cmdk__search">
                    <i class="fas fa-search"></i>
                    <input type="text" id="spCmdkInput" placeholder="${t('common.searchPlaceholder', 'ابحث عن صفحة أو إجراء...')}">
                </div>
                <div class="sp-cmdk__list" id="spCmdkList"></div>
                <div class="sp-cmdk__hint">
                    <span><kbd>↑</kbd><kbd>↓</kbd> ${t('common.navigate', 'تنقل')}</span>
                    <span><kbd>↵</kbd> ${t('common.open', 'فتح')}</span>
                    <span><kbd>Esc</kbd> ${t('common.close', 'إغلاق')}</span>
                </div>
            </div>`;
        document.body.appendChild(root);

        const input = root.querySelector('#spCmdkInput');
        const list = root.querySelector('#spCmdkList');
        let active = 0;
        let filtered = [];

        const render = (q = '') => {
            const query = q.trim().toLowerCase();
            filtered = this.commands
                .map((c) => ({ ...c, label: t(c.i18n, c.i18n) }))
                .filter((c) => !query || c.label.toLowerCase().includes(query));
            active = 0;
            if (!filtered.length) {
                list.innerHTML = `<div class="sp-cmdk__empty">${t('common.noData', 'لا توجد نتائج')}</div>`;
                return;
            }
            list.innerHTML = filtered.map((c, i) => `
                <a href="${c.href}" class="sp-cmdk__item ${i === 0 ? 'active' : ''}" data-idx="${i}">
                    <span class="sp-cmdk__ico ${c.chip}"><i class="fas ${c.icon}"></i></span>
                    <span>${c.label}</span>
                </a>`).join('');
        };

        const open = () => { root.classList.add('open'); render(); input.value = ''; setTimeout(() => input.focus(), 50); };
        const close = () => root.classList.remove('open');
        const setActive = (i) => {
            const items = list.querySelectorAll('.sp-cmdk__item');
            if (!items.length) return;
            active = (i + items.length) % items.length;
            items.forEach((el, idx) => el.classList.toggle('active', idx === active));
            items[active].scrollIntoView({ block: 'nearest' });
        };

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); root.classList.contains('open') ? close() : open(); }
            if (!root.classList.contains('open')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
            if (e.key === 'Enter') { e.preventDefault(); const el = list.querySelectorAll('.sp-cmdk__item')[active]; if (el) window.location.href = el.getAttribute('href'); }
        });
        input?.addEventListener('input', (e) => render(e.target.value));
        root.addEventListener('click', (e) => { if (e.target === root) close(); });
        document.getElementById('navSearchTrigger')?.addEventListener('click', open);
        document.getElementById('navSearchTrigger')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    },

    /* ---------------- Scroll reveal ---------------- */
    initReveal() {
        const els = document.querySelectorAll('.sp-reveal');
        if (!els.length) return;
        if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    setTimeout(() => entry.target.classList.add('in'), i * 60);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });
        els.forEach((e) => io.observe(e));
    },

    /* ---------------- Count-up numbers ---------------- */
    initCountUp() {
        const els = document.querySelectorAll('[data-countup]');
        const run = (el) => {
            const target = parseFloat(el.dataset.countup) || 0;
            const dur = 1100;
            const prefix = el.dataset.prefix || '';
            const suffix = el.dataset.suffix || '';
            const decimals = parseInt(el.dataset.decimals || '0', 10);
            const start = performance.now();
            const tick = (now) => {
                const p = Math.min((now - start) / dur, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                const val = (target * eased).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
                el.textContent = `${prefix}${val}${suffix}`;
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };
        if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => { if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); } });
        }, { threshold: 0.4 });
        els.forEach((e) => io.observe(e));
    },

    /* ---------------- Animated progress bars ---------------- */
    initProgress() {
        const bars = document.querySelectorAll('.sp-progress__bar[data-value]');
        if (!bars.length) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.width = `${entry.target.dataset.value}%`;
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        bars.forEach((b) => io.observe(b));
    },

    /* ---------------- Revenue area chart (Chart.js) ---------------- */
    revenueChart(canvasId, labels, data) {
        const el = document.getElementById(canvasId);
        if (!el || typeof Chart === 'undefined') return;
        const ctx = el.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, el.height || 240);
        grad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    data,
                    fill: true,
                    backgroundColor: grad,
                    borderColor: '#6366f1',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#6366f1',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1b2436' : '#0f172a',
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: false,
                        titleColor: '#fff',
                        bodyColor: '#cbd5e1',
                        callbacks: { label: (c) => `${Number(c.parsed.y).toLocaleString()} USD` },
                    },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: isDark ? '#6b7890' : '#94a3b8', font: { size: 11 } } },
                    y: { grid: { color: isDark ? '#232d42' : '#eef2f7' }, ticks: { color: isDark ? '#6b7890' : '#94a3b8', font: { size: 11 }, maxTicksLimit: 5 }, border: { display: false } },
                },
                animation: { duration: 1200, easing: 'easeOutQuart' },
            },
        });
    },
};

document.addEventListener('DOMContentLoaded', () => SaasShell.init());
window.SaasShell = SaasShell;
