document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const alertEl = document.getElementById("registerAlert");
  const btn = document.getElementById("registerBtn");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    PosApi.hideAlert(alertEl);
    btn.disabled = true;

    const fd = new FormData(form);
    const res = await PosApi.request("/auth/register", {
      method: "POST",
      body: fd,
      skipRedirect: true,
    });

    btn.disabled = false;
    if (res.key === "success") {
      const email = fd.get("email");
      window.location.href = `/dashboard/verify-email?email=${encodeURIComponent(email)}`;
      return;
    }
    PosApi.showAlert(alertEl, res.message || PosApi.t("auth.failed"));
  });
});
