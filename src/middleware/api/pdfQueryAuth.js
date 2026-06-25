/**
 * Allow PDF download links to pass JWT via ?token= when opened in a browser/WebView.
 */
export const pdfQueryAuth = (req, _res, next) => {
    const raw = req.query.token || req.query.accessToken;
    if (raw && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${String(raw).trim()}`;
    }
    next();
};

export default pdfQueryAuth;
