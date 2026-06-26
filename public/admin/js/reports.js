document.addEventListener('DOMContentLoaded', () => {
    const incomeForm = document.getElementById('incomeForm');
    const balanceForm = document.getElementById('balanceForm');
    const revenueForm = document.getElementById('revenueForm');

    const bindReport = (form, fetcher, containerId, renderer) => {
        const container = document.getElementById(containerId);
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('[type="submit"]');
            SaasUI.setLoading(container, true);
            if (btn) btn.disabled = true;
            try {
                const res = await fetcher(new FormData(form));
                if (!res.success) {
                    container.innerHTML = SaasUI.errorState(res.message || PosApi.t('common.responseError'));
                    return;
                }
                container.innerHTML = renderer(res.data, res.message);
                SaasUI.animateIn(container);
            } finally {
                SaasUI.setLoading(container, false);
                if (btn) btn.disabled = false;
            }
        });
    };

    bindReport(incomeForm, async (fd) => {
        const q = new URLSearchParams(fd).toString();
        return PosApi.request(`/reports/income-statement?${q}`);
    }, 'incomeResult', (data) => SaasUI.renderIncomeStatement(data));

    bindReport(balanceForm, async (fd) => {
        const q = new URLSearchParams(fd).toString();
        return PosApi.request(`/reports/balance-sheet?${q}`);
    }, 'balanceResult', (data) => SaasUI.renderBalanceSheet(data));

    bindReport(revenueForm, async (fd) => {
        const body = Object.fromEntries(fd.entries());
        return PosApi.request('/revenue-recognition/run', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }, 'revenueResult', (data, message) => SaasUI.renderRevenueResult(data, message));

    SaasUI.initPage();
});
