'use strict';

/**
 * One-time repair: replay sale returns to sync tbl_sale_payments amounts and sale totals
 * for invoices processed before payment-row updates were applied.
 * Safe to re-run — recalculates from return history.
 */
module.exports = {
    async up(queryInterface) {
        const sequelize = queryInterface.sequelize;
        const { QueryTypes } = sequelize;

        const {
            computeRefundSplit,
            computeUpdatedPaymentAmounts,
            computeUpdatedSaleAmounts,
        } = await import('../../helpers/api/sales/saleReturnCalculations.js');
        const { roundMoney } = await import('../../helpers/api/sales/saleCalculations.js');

        const saleIds = await sequelize.query(
            `SELECT DISTINCT sale_id FROM tbl_sale_returns ORDER BY sale_id`,
            { type: QueryTypes.SELECT }
        );

        for (const { sale_id: saleId } of saleIds) {
            const [sale] = await sequelize.query(
                `SELECT id, total, paid_amount, due_amount FROM tbl_sales WHERE id = :id LIMIT 1`,
                { replacements: { id: saleId }, type: QueryTypes.SELECT }
            );
            if (!sale) continue;

            const returns = await sequelize.query(
                `SELECT id, total FROM tbl_sale_returns WHERE sale_id = :saleId ORDER BY id ASC`,
                { replacements: { saleId }, type: QueryTypes.SELECT }
            );
            if (!returns.length) continue;

            const payments = await sequelize.query(
                `SELECT sp.id, sp.payment_method_id, sp.payment_method, sp.amount,
                        pm.affectsCashbox, pm.code
                 FROM tbl_sale_payments sp
                 LEFT JOIN tbl_payment_methods pm ON pm.id = sp.payment_method_id
                 WHERE sp.sale_id = :saleId
                 ORDER BY sp.id ASC`,
                { replacements: { saleId }, type: QueryTypes.SELECT }
            );

            const paymentModels = payments.map((row) => ({
                id: row.id,
                payment_method_id: row.payment_method_id,
                payment_method: row.payment_method,
                amount: Number(row.amount),
                paymentMethod: {
                    affectsCashbox: Boolean(row.affectsCashbox),
                    code: row.code,
                },
            }));

            const returnsTotal = returns.reduce((sum, row) => sum + Number(row.total), 0);
            const originalTotal = roundMoney(Number(sale.total) + returnsTotal);
            const paymentsSum = roundMoney(
                paymentModels.reduce((sum, row) => sum + Number(row.amount), 0)
            );
            const originalPaid = Math.min(paymentsSum, originalTotal);

            let workingSale = {
                total: originalTotal,
                paid_amount: originalPaid,
                due_amount: roundMoney(Math.max(0, originalTotal - originalPaid)),
            };

            const paymentAmounts = new Map(
                paymentModels.map((row) => [row.id, roundMoney(row.amount)])
            );

            for (const saleReturn of returns) {
                const returnTotal = roundMoney(saleReturn.total);
                const paymentsSnapshot = paymentModels.map((row) => ({
                    ...row,
                    amount: paymentAmounts.get(row.id),
                }));

                const refund = computeRefundSplit(workingSale, returnTotal, paymentsSnapshot);
                const updatedSale = computeUpdatedSaleAmounts(workingSale, returnTotal, refund);
                const updates = computeUpdatedPaymentAmounts(paymentsSnapshot, refund);

                for (const row of updates) {
                    paymentAmounts.set(row.id, row.amount);
                }

                workingSale = updatedSale;
            }

            await sequelize.query(
                `UPDATE tbl_sales
                 SET total = :total, paid_amount = :paid, due_amount = :due, updatedAt = NOW()
                 WHERE id = :id`,
                {
                    replacements: {
                        id: saleId,
                        total: workingSale.total.toFixed(2),
                        paid: workingSale.paid_amount.toFixed(2),
                        due: workingSale.due_amount.toFixed(2),
                    },
                }
            );

            for (const [paymentId, amount] of paymentAmounts.entries()) {
                await sequelize.query(
                    `UPDATE tbl_sale_payments SET amount = :amount, updatedAt = NOW() WHERE id = :id`,
                    { replacements: { id: paymentId, amount: amount.toFixed(2) } }
                );
            }
        }

        console.log(`[repair-sale-payments-after-returns] processed ${saleIds.length} sale(s)`);
    },

    async down() {
        /* data repair — no rollback */
    },
};
