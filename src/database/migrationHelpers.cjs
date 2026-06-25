'use strict';

async function tableExists(queryInterface, tableName) {
    const tables = await queryInterface.showAllTables();
    return tables.some((table) => {
        if (typeof table === 'string') return table === tableName;
        return table.tableName === tableName || table.TABLE_NAME === tableName;
    });
}

function timestamps(Sequelize) {
    return {
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
    };
}

async function createTableIfNotExists(queryInterface, tableName, attributes, options = {}) {
    if (await tableExists(queryInterface, tableName)) {
        console.log(`  ⏭  ${tableName} already exists — skipped`);
        return;
    }
    await queryInterface.createTable(tableName, attributes, options);
    console.log(`  ✅ ${tableName} created`);
}

async function dropTableIfExists(queryInterface, tableName) {
    if (await tableExists(queryInterface, tableName)) {
        await queryInterface.dropTable(tableName);
        console.log(`  🗑  ${tableName} dropped`);
    }
}

module.exports = {
    tableExists,
    timestamps,
    createTableIfNotExists,
    dropTableIfExists,
};
