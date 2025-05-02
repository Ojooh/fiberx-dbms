import { TableSchemaInterface, QueryFormatOptionInterface } from "../types/common_types";
declare abstract class BaseQueryBuilder {
    abstract escapeField(field: string): string;
    abstract escapeValue(value: any): string;
    abstract formatWhereClause(where?: object): string;
    abstract formatOptions(options?: QueryFormatOptionInterface): string;
    abstract select(table_name: string, fields: string[], where?: object, options?: QueryFormatOptionInterface): string;
    abstract selectCount(table_name: string, where?: object, options?: QueryFormatOptionInterface): string;
    abstract insert(table_name: string, data: object, options?: QueryFormatOptionInterface): string;
    abstract update(table_name: string, where: object, data: object, options?: QueryFormatOptionInterface): string;
    abstract delete(table_name: string, where: object, options?: QueryFormatOptionInterface): string;
    abstract createTable(table_schema: TableSchemaInterface): string;
    abstract createIndex(table_name: string, index_fields: string[], unique: boolean): string;
    abstract bulkInsert(table_schema: TableSchemaInterface, value: any[][], options?: QueryFormatOptionInterface): string;
    abstract addColumn(table_name: string, column_name: string, column_definition: any, position?: {
        before?: string;
        after?: string;
    }): string;
    abstract dropColumn(table_name: string, column_name: string): string;
    abstract dropIndex(table_name: string, index_name: string): string;
    abstract dropTable(table_name: string): string;
    beginTransaction(): string;
    commitTransaction(): string;
    rollbackTransaction(): string;
}
export default BaseQueryBuilder;
