'use strict';

/**
 * One-time: apply existing tbl_customer_payments totals to open sales (FIFO) and opening balance.
 * Safe to re-run — only reduces due_amount / opening_balance while debt remains.
 */
module.exports = {
    async up(queryInterface) {
        const sequelize = queryInterface.sequelize;
        const { QueryTypes } = sequelize;

        const customers = await sequelize.query(
            `SELECT customer_id, COALESCE(SUM(amount), 0) AS total_paid
             FROM tbl_customer_payments
             GROUP BY customer_id
             HAVING total_paid > 0`,
            { type: QueryTypes.SELECT }
        );

        for (const row of customers) {
            let remaining = Number(row.total_paid) || 0;
            const customerId = row.customer_id;

            const [customer] = await sequelize.query(
                `SELECT id, opening_balance FROM tbl_customers WHERE id = :id LIMIT 1`,
                { replacements: { id: customerId }, type: QueryTypes.SELECT }
            );
            if (!customer) continue;

            const openSales = await sequelize.query(
                `SELECT id, branchId, paid_amount, due_amount
                 FROM tbl_sales
                 WHERE customer_id = :customerId
                   AND status = 'completed'
                   AND due_amount > 0
                 ORDER BY invoice_date ASC, id ASC`,
                { replacements: { customerId }, type: QueryTypes.SELECT }
            );

            for (const sale of openSales) {
                if (remaining <= 0) break;
                const due = Number(sale.due_amount) || 0;
                const allocate = Math.min(remaining, due);
                if (allocate <= 0) continue;

                const newPaid = (Number(sale.paid_amount) || 0) + allocate;
                const newDue = due - allocate;

                await sequelize.query(
                    `UPDATE tbl_sales SET paid_amount = :paid, due_amount = :due, updatedAt = NOW()
                     WHERE id = :id`,
                    {
                        replacements: {
                            id: sale.id,
                            paid: newPaid.toFixed(2),
                            due: newDue.toFixed(2),
                        },
                    }
                );

                remaining -= allocate;
            }

            if (remaining > 0) {
                const opening = Number(customer.opening_balance) || 0;
                if (opening > 0) {
                    const reduce = Math.min(remaining, opening);
                    await sequelize.query(
                        `UPDATE tbl_customers SET opening_balance = :bal, updatedAt = NOW() WHERE id = :id`,
                        {
                            replacements: {
                                id: customerId,
                                bal: (opening - reduce).toFixed(2),
                            },
                        }
                    );
                }
            }
        }

        console.log('  ✅ Customer payment allocations reconciled');
    },

    async down() {
        // non-reversible
    },
};
