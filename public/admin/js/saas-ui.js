const SaasUI = {
    badge(text, type = 'neutral') {
        return `<span class="saas-badge saas-badge--${type}">${text}</span>`;
    },

    statusBadge(status) {
        const map = {
            active: 'success',
            paid: 'success',
            open: 'warning',
            cancelled: 'danger',
            paused: 'neutral',
            inactive: 'neutral',
            monthly: 'info',
            annual: 'info',
        };
        const type = map[status] || 'neutral';
        const label = (typeof AdminI18n !== 'undefined' && AdminI18n.t)
            ? AdminI18n.t(`status.${status}`, status)
            : status;
        return this.badge(label, type);
    },

    emptyState(icon, message) {
        return `<tr><td colspan="20"><div class="saas-empty"><i class="fas ${icon}"></i><div>${message}</div></div></td></tr>`;
    },

    actions(editId, showDelete = true) {
        return `<div class="saas-actions">
            <button type="button" class="saas-btn-ghost edit" data-id="${editId}"><i class="fas fa-pen"></i></button>
            ${showDelete ? `<button type="button" class="saas-btn-ghost danger del" data-id="${editId}"><i class="fas fa-trash"></i></button>` : ''}
        </div>`;
    },

    formatJson(data) {
        return JSON.stringify(data, null, 2);
    },
};
