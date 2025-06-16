const BaseQueryBuilder  = require("./base_query_builder")

class MysqlQueryBuilder extends BaseQueryBuilder {
    constructor(schema = {}, associations = [], logger = null) {
        super("mysql", schema, associations, logger);
        
    }
}

module.exports = MysqlQueryBuilder;
