import DataTypes from "@/datatypes/index";



const RoleSchema = {
    table_name: 'fibase_roles',

    model_name: 'Role',

    datasource: 'mysql_db', // or 'postgressql_db', 'mongo_db'

    columns: {
        id: { type: DataTypes.BIGINT(), auto_increment: true, unique: true },

        name: { type: DataTypes.STRING(100), nullable: false, unique: true },

        symbol: { type: DataTypes.STRING(10), nullable: false, unique: true },
            
        user_count: { type: DataTypes.BIGINT(), nullable: false, default: 0 },
            
        member_group: { type: DataTypes.BOOLEAN(), nullable: false, default: false },
            
        created_at: { type: DataTypes.DATE(), default: "CURRENT_TIMESTAMP" },

        updated_at: { type: DataTypes.DATE(), default: null, on_pdate: "CURRENT_TIMESTAMP" },
    },

    primary_key: 'id',

    indexes: [
        { name: 'idx_fibase_role_symbol', fields: ['symbol'] },
    ],

    migration_priority: 2,

    timestamps: true,
};
