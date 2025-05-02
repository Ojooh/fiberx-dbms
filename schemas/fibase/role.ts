
import DataTypes from "@/datatypes";

const RoleSchema = {
    app_id: 'fibase',

    table_name: 'fibase_roles',

    model_name: 'Role',

    datasource: 'mysql_db',

    primary_key: 'id',

    migration_priority: 3,

    timestamps: true,

    columns: {
                id: {type:{type:"BIGINT"},auto_increment:true,unique:true},
        name: {type:{type:"STRING",length:100},nullable:false,unique:true},
        symbol: {type:{type:"STRING",length:10},nullable:false,unique:true},
        user_count: {type:{type:"BIGINT"},nullable:false,default:0},
        member_group: {type:{type:"BOOLEAN"},nullable:false,default:false},
        created_at: {type:{type:"DATE"},default:"CURRENT_TIMESTAMP"},
        updated_at: {type:{type:"DATE"},default:null,on_update:"CURRENT_TIMESTAMP"},
    },

    indexes: [
    {
        name: "idx_fibase_role_symbol",
        fields: [
            "symbol"
        ]
    }
]
}

export default RoleSchema;
