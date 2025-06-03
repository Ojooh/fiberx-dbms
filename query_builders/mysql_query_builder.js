const BaseQueryBuilder  = require("./base_query_builder")

class MysqlQueryBuilder extends BaseQueryBuilder {
    constructor(model_instance = null, logger = null) {
        super(model_instance, "mysql", logger);
        
    }
}

module.exports = MysqlQueryBuilder;
