"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../datatypes/index"));
const RoleSchema = {
    table_name: 'fibase_roles',
    model_name: 'Role',
    datasource: 'mysql_db', // or 'postgressql_db', 'mongo_db'
    columns: {
        id: { type: index_1.default.BIGINT(), auto_increment: true, unique: true },
        name: { type: index_1.default.STRING(100), nullable: false, unique: true },
        symbol: { type: index_1.default.STRING(10), nullable: false, unique: true },
        user_count: { type: index_1.default.BIGINT(), nullable: false, default: 0 },
        member_group: { type: index_1.default.BOOLEAN(), nullable: false, default: false },
        created_at: { type: index_1.default.DATE(), default: "CURRENT_TIMESTAMP" },
        updated_at: { type: index_1.default.DATE(), default: null, on_pdate: "CURRENT_TIMESTAMP" },
    },
    primary_key: 'id',
    indexes: [
        { name: 'idx_fibase_role_symbol', fields: ['symbol'] },
    ],
    migration_priority: 2,
    timestamps: true,
};
