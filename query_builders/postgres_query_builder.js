const BaseQueryBuilder  = require("./base_query_builder")

class PostgresQueryBuilder extends BaseQueryBuilder {
    constructor(model_instance = null, logger = null) {
        super(model_instance, "postgres", logger);
    }
}

module.exports = PostgresQueryBuilder;
