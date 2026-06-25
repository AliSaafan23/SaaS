function initRegisterPage() {
    const form = document.getElementById('registerForm');
    const alertEl = document.getElementById('registerAlert');
    const btn = document.getElementById('registerBtn');
    const countrySelect = document.getElementById('registerCountrySelect');

    if (form?.dataset.bound === '1') return;
    if (form) form.dataset.bound = '1';

    const placeholderHtml = () => {
        const label = MerchantApi.t('auth.register.selectCountry', 'اختر الدولة');
        return `<option value="">${label}</option>`;
    };

    const setCountryLoading = () => {
        if (!countrySelect) return;
        const loading = MerchantApi.t('common.loading', 'جاري التحميل...');
        countrySelect.innerHTML = `<option value="">${loading}</option>`;
        countrySelect.disabled = true;
    };

    const loadCountries = async () => {
        if (!countrySelect) return;

        const previous = countrySelect.value;
        setCountryLoading();

        const res = await MerchantApi.request('/countries', { skipRedirect: true });

        countrySelect.disabled = false;
        countrySelect.innerHTML = placeholderHtml();

        if (res.key !== 'success' || !Array.isArray(res.data) || !res.data.length) {
            const empty = MerchantApi.t('auth.register.noCountries', 'لا توجد دول متاحة — تواصل مع الإدارة');
            countrySelect.innerHTML = `<option value="">${empty}</option>`;
            countrySelect.disabled = true;
            MerchantApi.showAlert(alertEl, empty, 'warning');
            return;
        }

        MerchantApi.hideAlert(alertEl);

        res.data.forEach((c) => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            countrySelect.appendChild(opt);
        });

        if (previous && [...countrySelect.options].some((o) => o.value === previous)) {
            countrySelect.value = previous;
        }
    };

    loadCountries();

    window.onMerchantLangChange = () => {
        MerchantI18n.apply();
        loadCountries();
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        MerchantApi.hideAlert(alertEl);
        btn.disabled = true;

        const fd = new FormData(form);
        const body = Object.fromEntries(fd.entries());
        body.countryId = Number(body.countryId);

        if (!body.countryId) {
            btn.disabled = false;
            MerchantApi.showAlert(alertEl, MerchantApi.t('auth.register.countryRequired', 'يجب اختيار الدولة'));
            return;
        }

        const res = await MerchantApi.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(body),
            skipRedirect: true,
        });

        btn.disabled = false;

        if (res.key === 'success') {
            window.location.href = `/merchant/verify-email?email=${encodeURIComponent(body.email)}`;
            return;
        }

        MerchantApi.showAlert(alertEl, res.message || MerchantApi.t('auth.register.failed'));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRegisterPage);
} else {
    initRegisterPage();
}

window.initRegisterPage = initRegisterPage;
