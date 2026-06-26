document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("verifyForm");
  const alertEl = document.getElementById("verifyAlert");
  const verifyBtn = document.getElementById("verifyBtn");
  const resendBtn = document.getElementById("resendBtn");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    PosApi.hideAlert(alertEl);
    verifyBtn.disabled = true;

    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());

    const res = await PosApi.request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(body),
      skipRedirect: true,
    });

    verifyBtn.disabled = false;
    if (res.key === "success") {
      window.location.href = "/dashboard/home";
      return;
    }
    PosApi.showAlert(alertEl, res.message || PosApi.t("auth.verifyFailed"));
  });

  resendBtn?.addEventListener("click", async () => {
    const email = form?.querySelector('[name="email"]')?.value;
    if (!email) return;

    resendBtn.disabled = true;
    const res = await PosApi.request("/auth/resend-code", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipRedirect: true,
    });
    resendBtn.disabled = false;

    if (res.key === "success") {
      PosApi.showAlert(alertEl, res.message, "success");
      return;
    }
    PosApi.showAlert(alertEl, res.message || PosApi.t("auth.verifyFailed"));
  });
});
