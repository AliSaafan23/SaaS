document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const alertEl = document.getElementById("loginAlert");
  const btn = document.getElementById("loginBtn");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    PosApi.hideAlert(alertEl);
    btn.disabled = true;
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    const res = await PosApi.request("/auth/signin", {
      method: "POST",
      body: JSON.stringify(body),
      skipRedirect: true,
    });
    btn.disabled = false;
    if (res.key === "success" || res.success) {
      window.location.href = "/dashboard/home";
      return;
    }
    if (res.key === "needActive") {
      const email = body.email;
      window.location.href = `/dashboard/verify-email?email=${encodeURIComponent(email)}`;
      return;
    }
    PosApi.showAlert(alertEl, res.message || PosApi.t("auth.failed"));
  });
});
