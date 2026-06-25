import { sequelize, Product, StockMovement } from '../../models/index.js';

const DECIMAL_SCALE = 4;

const roundQty = (value) =>
    Math.round(Number(value) * 10 ** DECIMAL_SCALE) / 10 ** DECIMAL_SCALE;

/**
 * Atomically update Product.quantity and append a StockMovement row.
 */
export const adjustStock = async ({
    productId,
    qtyDelta,
    movementType,
    saleId = null,
    purchaseId = null,
    saleReturnId = null,
    purchaseReturnId = null,
    transaction,
    allowNegative = false,
    branchId = null,
}) => {
    if (!productId) {
        throw new Error('adjustStock: productId is required');
    }

    if (!movementType) {
        throw new Error('adjustStock: movementType is required');
    }

    const delta = roundQty(qtyDelta);
    if (delta === 0) {
        throw new Error('adjustStock: qtyDelta cannot be zero');
    }

    const run = async (tx) => {
        const product = await Product.findByPk(productId, {
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });

        if (!product) {
            throw new Error(`adjustStock: product ${productId} not found`);
        }

        const qtyBefore = roundQty(product.quantity);
        const qtyAfter = roundQty(qtyBefore + delta);

        if (!allowNegative && qtyAfter < 0) {
            throw new Error(
                `adjustStock: insufficient stock for product ${productId} (have ${qtyBefore}, need ${Math.abs(delta)})`
            );
        }

        await product.update({ quantity: qtyAfter }, { transaction: tx });

        const movement = await StockMovement.create(
            {
                product_id: productId,
                movement_type: movementType,
                qty_before: qtyBefore,
                qty: delta,
                qty_after: qtyAfter,
                sale_id: saleId,
                purchase_id: purchaseId,
                sale_return_id: saleReturnId,
                purchase_return_id: purchaseReturnId,
                branchId,
            },
            { transaction: tx }
        );

        return { product, movement, qtyBefore, qtyAfter };
    };

    if (transaction) {
        return run(transaction);
    }

    return sequelize.transaction(run);
};

export const addStock = (params) =>
    adjustStock({
        ...params,
        movementType: params.movementType || 'manual_add',
        qtyDelta: Math.abs(params.qtyDelta ?? params.qty ?? 0),
    });

export const removeStock = (params) => {
    const qty = params.qtyDelta ?? params.qty ?? 0;
    return adjustStock({
        ...params,
        movementType: params.movementType || 'sale',
        qtyDelta: -Math.abs(qty),
    });
};

export default { adjustStock, addStock, removeStock };
