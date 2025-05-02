import { SchemaTemplateType, InitialMigrationTemplateType, DeltaMigrationTemplateType } from "../types/common_types";
declare const pascalToSnake: (name: string) => string;
declare const schema_code_template: (values: SchemaTemplateType) => string;
declare const initial_migration_code_template: (values: InitialMigrationTemplateType) => string;
declare const delta_migration_code_template: (values: DeltaMigrationTemplateType) => string;
declare const model_code_templates: (app_id: string, model_name: string) => string;
export { pascalToSnake, schema_code_template, initial_migration_code_template, delta_migration_code_template, model_code_templates, };
