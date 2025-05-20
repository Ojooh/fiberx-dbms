
const MysqlQueryBuilder     =  require("./mysql_query_builder");
const PostgresQueryBuilder  =  require("./postgres_query_builder");
const MongoQueryBuilder     =  require("./mongo_query_builder");

const queryBuilderMap = {
    mysql_db: new MysqlQueryBuilder(),
    postgresql_db: new PostgresQueryBuilder(),
    mongo_db: new MongoQueryBuilder()
};

const getQueryBuilder = (datasource_id) => {
    const builder = queryBuilderMap[datasource_id];
    if (!builder) throw new Error(`No query builder for ${datasource_id}`);
    return builder;
};

module.exports = getQueryBuilder;
