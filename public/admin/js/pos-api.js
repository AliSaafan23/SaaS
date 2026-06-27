const PosApi = {
  base: "/dashboard",
  THEME_KEY: "pos-theme",
  _dialogResolve: null,

  getLang() {
    return window.AdminI18n?.getLang?.() || "ar";
  },

  t(key, fallback = "") {
    return window.AdminI18n?.t?.(key, fallback) || fallback || key;
  },

  tpl(key, vars = {}, fallback = "") {
    return window.AdminI18n?.tpl?.(key, vars, fallback) || fallback || key;
  },

  localeTag() {
    return this.getLang() === "ar" ? "ar-EG" : "en-US";
  },

  formatNum(n) {
    return Number(n || 0).toLocaleString(this.localeTag());
  },

  formatMoney(n) {
    const cur = this.t("common.currency", "EGP");
    return `${this.formatNum(n)} ${cur}`;
  },

  can(permission) {
    const perms = window.__USER_PERMS__ || [];
    if (!permission) return true;
    return perms.includes("*") || perms.includes(permission);
  },

  formatDate(d, opts = { dateStyle: "medium", timeStyle: "short" }) {
    if (!d) return this.t("common.emDash", "—");
    return new Date(d).toLocaleString(this.localeTag(), opts);
  },

  billingLabel(cycle) {
    return this.t(`billing.${cycle}`, cycle);
  },

  platformLabel(platform) {
    return this.t(`platform.${platform}`, platform);
  },

  async request(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    const res = await fetch(`${this.base}${path}`, {
      credentials: "include",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        Accept: "application/json",
        lang: this.getLang(),
        ...(options.headers || {}),
      },
      ...options,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = {
        success: false,
        message: this.t("common.responseError", "Response error"),
      };
    }

    if (res.status === 401 && !options.skipRedirect) {
      window.location.href = "/dashboard/login";
      return data;
    }

    if (res.status === 403 && !options.skipToast) {
      const msg = data?.message || this.t("common.forbidden", "غير مصرح لك بهذا الإجراء");
      this.toast?.(msg, "error");
    }

    return data;
  },

  showAlert(el, message, type = "danger") {
    if (!el) return;
    el.className = `alert alert-${type} pos-alert`;
    el.textContent = message;
    el.classList.remove("d-none");
  },

  hideAlert(el) {
    if (el) el.classList.add("d-none");
  },

  initDialog() {
    const root = document.getElementById("posDialogRoot");
    if (!root || root.dataset.bound) return;
    root.dataset.bound = "1";

    const confirmBtn = document.getElementById("posDialogConfirm");
    const cancelBtn = document.getElementById("posDialogCancel");

    confirmBtn?.addEventListener("click", () => this._closeDialog(true));
    cancelBtn?.addEventListener("click", () => this._closeDialog(false));
    root
      .querySelector(".pos-dialog-backdrop")
      ?.addEventListener("click", () => {
        if (root.classList.contains("is-alert")) this._closeDialog(true);
        else this._closeDialog(false);
      });

    document.addEventListener("keydown", (e) => {
      if (root.hidden) return;
      if (e.key === "Escape")
        this._closeDialog(root.classList.contains("is-alert"));
    });
  },

  _dialogIcons: {
    confirm: "fa-question-circle",
    danger: "fa-exclamation-triangle",
    success: "fa-check-circle",
    warning: "fa-exclamation-circle",
    info: "fa-info-circle",
    error: "fa-times-circle",
  },

  _openDialog({
    mode,
    title,
    message,
    confirmText,
    cancelText,
    variant,
    type,
  }) {
    this.initDialog();
    const root = document.getElementById("posDialogRoot");
    if (!root) return Promise.resolve(mode === "alert");

    const iconEl = document.getElementById("posDialogIcon");
    const titleEl = document.getElementById("posDialogTitle");
    const messageEl = document.getElementById("posDialogMessage");
    const confirmBtn = document.getElementById("posDialogConfirm");
    const cancelBtn = document.getElementById("posDialogCancel");

    const isAlert = mode === "alert";
    const visual = variant || type || (isAlert ? "info" : "confirm");

    root.className = "pos-dialog-root";
    root.classList.add(isAlert ? "is-alert" : "is-confirm");
    if (["danger", "success", "warning", "info"].includes(visual)) {
      root.classList.add(`is-${visual}`);
    }

    const iconClass = this._dialogIcons[visual] || this._dialogIcons.confirm;
    if (iconEl) iconEl.innerHTML = `<i class="fas ${iconClass}"></i>`;

    if (titleEl)
      titleEl.textContent =
        title || this.t(isAlert ? "dialog.alertTitle" : "dialog.confirmTitle");
    if (messageEl) messageEl.textContent = message || "";

    if (confirmBtn) {
      confirmBtn.textContent =
        confirmText ||
        (isAlert ? this.t("dialog.ok") : this.t("dialog.confirm"));
      confirmBtn.classList.toggle(
        "btn-danger",
        visual === "danger" && !isAlert,
      );
      confirmBtn.classList.toggle(
        "btn-pos-primary",
        visual !== "danger" || isAlert,
      );
    }
    if (cancelBtn)
      cancelBtn.textContent = cancelText || this.t("dialog.cancel");

    root.hidden = false;
    root.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    confirmBtn?.focus();

    return new Promise((resolve) => {
      this._dialogResolve = resolve;
    });
  },

  _closeDialog(result) {
    const root = document.getElementById("posDialogRoot");
    if (root) {
      root.hidden = true;
      root.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
    if (this._dialogResolve) {
      const resolve = this._dialogResolve;
      this._dialogResolve = null;
      resolve(result);
    }
  },

  confirm({
    title,
    message = "",
    confirmText,
    cancelText,
    variant = "confirm",
  } = {}) {
    return this._openDialog({
      mode: "confirm",
      title: title ?? this.t("dialog.confirmTitle"),
      message,
      confirmText: confirmText ?? this.t("dialog.confirm"),
      cancelText: cancelText ?? this.t("dialog.cancel"),
      variant,
    });
  },

  confirmDelete(message, { title } = {}) {
    return this.confirm({
      title: title ?? this.t("dialog.deleteTitle", "تأكيد الحذف"),
      message: message ?? this.t("common.confirmDelete"),
      variant: "danger",
      confirmText: this.t("common.delete", "حذف"),
    });
  },

  notify({ title, message = "", type = "info", buttonText } = {}) {
    const map = {
      error: "danger",
      fail: "danger",
      danger: "danger",
      success: "success",
      warning: "warning",
      info: "info",
    };
    return this._openDialog({
      mode: "alert",
      title: title ?? this.t("dialog.alertTitle"),
      message,
      type: map[type] || type,
      confirmText: buttonText ?? this.t("dialog.ok"),
    });
  },

  toast(message, type = "info", { title = "", duration = 4200 } = {}) {
    const host = document.getElementById("posToastHost");
    if (!host || !message) return;

    const map = {
      error: "danger",
      fail: "danger",
      danger: "danger",
      success: "success",
      warning: "warning",
    };
    const visual = map[type] || type;
    const icons = {
      success: "fa-check",
      danger: "fa-times",
      warning: "fa-exclamation",
      info: "fa-info",
    };

    const el = document.createElement("div");
    el.className = `pos-toast ${visual}`;
    el.innerHTML = `
            <div class="pos-toast-icon"><i class="fas ${icons[visual] || icons.info}"></i></div>
            <div class="pos-toast-body">
                ${title ? `<div class="pos-toast-title">${title}</div>` : ""}
                <div class="pos-toast-message">${message}</div>
            </div>`;
    host.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(-6px)";
      el.style.transition = "opacity 0.2s, transform 0.2s";
      setTimeout(() => el.remove(), 220);
    }, duration);
  },

  statusBadge(status) {
    const label = this.t(`status.${status}`, status);
    const map = {
      active: "text-bg-success",
      block: "text-bg-warning",
      suspend: "text-bg-warning",
      delete: "text-bg-danger",
      pending: "text-bg-warning",
      suspended: "text-bg-secondary",
      expired: "text-bg-danger",
      none: "text-bg-light text-dark",
      disabled: "text-bg-secondary",
    };
    const cls = map[status] || "text-bg-secondary";
    return `<span class="badge rounded-pill ${cls}">${label}</span>`;
  },

  getTheme() {
    return localStorage.getItem(this.THEME_KEY) || "light";
  },

  setTheme(theme) {
    const next = theme === "dark" ? "dark" : "light";
    localStorage.setItem(this.THEME_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
    this.updateThemeIcon(next);
  },

  toggleTheme() {
    this.setTheme(this.getTheme() === "dark" ? "light" : "dark");
  },

  updateThemeIcon(theme) {
    const icon = document.getElementById("themeToggleIcon");
    if (!icon) return;
    icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  },

  initTheme() {
    const theme = this.getTheme();
    document.documentElement.setAttribute("data-theme", theme);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.updateThemeIcon(theme),
      );
    } else {
      this.updateThemeIcon(theme);
    }
  },

  initNavGroups() {
    document.querySelectorAll(".pos-nav-group-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = btn.closest(".pos-nav-group");
        group?.classList.toggle("open");
        btn.setAttribute(
          "aria-expanded",
          group?.classList.contains("open") ? "true" : "false",
        );
      });
    });
  },

  initGlobalSearch() {
    const input = document.getElementById("globalSearch");
    if (!input) return;

    let timer;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const q = input.value.trim();
        if (q.length < 2) return;
        console.info("[PosApi] global search stub:", q);
      }, 400);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const q = input.value.trim();
        if (q) console.info("[PosApi] global search stub (enter):", q);
      }
    });
  },
};

PosApi.initTheme();

document.addEventListener("DOMContentLoaded", () => {
  PosApi.initDialog();

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await PosApi.request("/auth/logout", { method: "POST" });
    window.location.href = "/dashboard/login";
  });

  // Sidebar drawer + theme toggle are handled by SaasShell on dashboard pages.
  // Password show/hide toggle (works on auth pages too).
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-password-toggle]");
    if (!btn) return;
    const input = document.getElementById(btn.dataset.passwordToggle);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    const icon = btn.querySelector("i");
    if (icon) icon.className = show ? "fas fa-eye-slash" : "fas fa-eye";
  });

  PosApi.initNavGroups();
  PosApi.initGlobalSearch();
});

document.addEventListener("admin:langchange", () => {
  if (typeof window.onAdminLangChange === "function") {
    window.onAdminLangChange();
  }
});

window.PosApi = PosApi;
