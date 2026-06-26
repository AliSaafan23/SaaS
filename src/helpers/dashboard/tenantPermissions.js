export const hasPermission = (user, permission) => {
    const perms = user?.role?.permissions || [];
    if (perms.includes('*')) return true;
    return perms.includes(permission);
};

export default { hasPermission };
