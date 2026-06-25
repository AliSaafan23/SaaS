export const lang = (req) => req.getLocale?.() || req.headers.lang || 'ar';
