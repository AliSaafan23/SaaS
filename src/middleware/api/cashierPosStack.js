import { requireAuth, requireActiveCashier } from '../auth/passport.js';
import { dataIsolation } from '../protection/dataIsolation.js';
import { pdfQueryAuth } from './pdfQueryAuth.js';

/** Standard middleware chain for cashier POS module routes */
export const cashierPosStack = [pdfQueryAuth, requireAuth, requireActiveCashier, dataIsolation];

export default cashierPosStack;
