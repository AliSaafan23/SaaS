document.addEventListener('DOMContentLoaded', () => {
    const incomeForm = document.getElementById('incomeForm');
    const balanceForm = document.getElementById('balanceForm');
    const revenueForm = document.getElementById('revenueForm');

    incomeForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(incomeForm);
        const q = new URLSearchParams(fd).toString();
        const res = await PosApi.request(`/reports/income-statement?${q}`);
        document.getElementById('incomeResult').textContent = SaasUI.formatJson(res.data || res);
    });

    balanceForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(balanceForm);
        const q = new URLSearchParams(fd).toString();
        const res = await PosApi.request(`/reports/balance-sheet?${q}`);
        document.getElementById('balanceResult').textContent = SaasUI.formatJson(res.data || res);
    });

    revenueForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(revenueForm);
        const body = Object.fromEntries(fd.entries());
        const res = await PosApi.request('/revenue-recognition/run', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        document.getElementById('revenueResult').textContent = SaasUI.formatJson(res.data || res);
    });
});
