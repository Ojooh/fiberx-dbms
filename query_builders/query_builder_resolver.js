
const MysqlQueryBuilder     =  require("./mysql_query_builder");
const PostgresQueryBuilder  =  require("./postgres_query_builder");
const MongoQueryBuilder     =  require("./mongo_query_builder");

const queryBuilderMap = {
    mysql_db: MysqlQueryBuilder,
    postgresql_db: PostgresQueryBuilder,
    mongo_db: MongoQueryBuilder
};

const getQueryBuilder = (datasource_type, schema = {}, associations = [], logger_instance = null) => {
    const builder = new queryBuilderMap[datasource_type](schema, associations, logger_instance);

    if (!builder) { throw new Error(`No query builder for ${datasource_type}`); }
    
    return builder;
};

module.exports = getQueryBuilder;
