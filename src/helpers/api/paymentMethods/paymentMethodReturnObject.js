const paymentMethod = (item, lang = 'ar') => ({
    id: item.id,
    code: item.code,
    name: item.getLocalizedName ? item.getLocalizedName(lang) : lang === 'en' ? item.nameEn : item.nameAr,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    affectsCashbox: Boolean(item.affectsCashbox),
    requiresCustomer: Boolean(item.requiresCustomer),
    isActive: Boolean(item.isActive),
    sortOrder: Number(item.sortOrder) || 0,
});

export default { paymentMethod };
