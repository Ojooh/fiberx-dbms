
const MysqlQueryBuilder     =  require("./mysql_query_builder");
const PostgresQueryBuilder  =  require("./postgres_query_builder");
const MongoQueryBuilder     =  require("./mongo_query_builder");

const queryBuilderMap = {
    mysql_db: new MysqlQueryBuilder(),
    postgresql_db: new PostgresQueryBuilder(),
    mongo_db: new MongoQueryBuilder()
};

const getQueryBuilder = (datasource_type) => {
    const builder = queryBuilderMap[datasource_type];

    if (!builder) { throw new Error(`No query builder for ${datasource_type}`); }
    
    return builder;
};

module.exports = getQueryBuilder;
