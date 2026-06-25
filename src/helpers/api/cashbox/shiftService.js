import { CashierShift } from '../../../models/index.js';
import { requireCatalogTenant } from '../inventory/catalogScope.js';
import { roundMoney } from '../sales/saleCalculations.js';

export class ShiftScopeError extends Error {
    constructor(code) {
        super(code);
        this.code = code;
    }
}

export const getShiftInScope = async (req, shiftId) => {
    const { branchId } = await requireCatalogTenant(req);
    if (!shiftId) return null;
    return CashierShift.findOne({
        where: { id: Number(shiftId), branchId },
    });
};

export const getActiveShift = async (req, { cashierId } = {}) => {
    const { branchId } = await requireCatalogTenant(req);
    const resolvedCashierId = cashierId ?? req.cashier?.id;
    if (!resolvedCashierId) return null;

    try {
        return await CashierShift.findOne({
            where: {
                branchId,
                cashierId: resolvedCashierId,
                closed_at: null,
            },
            order: [['opened_at', 'DESC']],
        });
    } catch (err) {
        if (err?.parent?.code === 'ER_NO_SUCH_TABLE') return null;
        throw err;
    }
};

export const openCashierShift = async (req, { openingCash = 0, notes } = {}) => {
    const { branchId } = await requireCatalogTenant(req);
    const cashierId = req.cashier?.id;
    if (!cashierId) throw new ShiftScopeError('cashierRequired');

    const existing = await getActiveShift(req, { cashierId });
    if (existing) throw new ShiftScopeError('shiftAlreadyOpen');

    const amount = roundMoney(openingCash);
    if (amount < 0) throw new ShiftScopeError('invalidOpeningCash');

    return CashierShift.create({
        branchId,
        cashierId,
        opening_cash: amount,
        opened_at: new Date(),
        notes: notes?.trim() || null,
    });
};

export const closeCashierShift = async (req, { closingCash, notes } = {}) => {
    const shift = await getActiveShift(req);
    if (!shift) throw new ShiftScopeError('shiftNotOpen');

    const closing = closingCash != null ? roundMoney(closingCash) : null;
    if (closing != null && closing < 0) throw new ShiftScopeError('invalidClosingCash');

    await shift.update({
        closed_at: new Date(),
        closing_cash: closing,
        notes: notes?.trim() || shift.notes,
    });

    return shift;
};

export default {
    ShiftScopeError,
    getShiftInScope,
    getActiveShift,
    openCashierShift,
    closeCashierShift,
};
