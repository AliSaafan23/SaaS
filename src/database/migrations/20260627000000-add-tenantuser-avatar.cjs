/** @param {import('sequelize').QueryInterface} queryInterface @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const { DataTypes: DT } = Sequelize;
        await queryInterface.addColumn('tbl_tenant_users', 'avatar', {
            type: DT.STRING(500),
            allowNull: true,
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeColumn('tbl_tenant_users', 'avatar');
    },
};
