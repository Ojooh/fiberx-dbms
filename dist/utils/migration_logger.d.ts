import { MigrationLogEntryInterface, MigrationStatusType } from "../types/common_types";
declare class MigrationLogger {
    private yaml_log_file_path;
    private uuid_generator_util;
    constructor();
    private readMigrationLogs;
    private writeMigrationLogs;
    logMigration(app_id: string, file: string, status: MigrationStatusType, error_message?: string): MigrationLogEntryInterface;
    listMigrationLogs(): MigrationLogEntryInterface[];
    getAppMigrations(app_id: string): MigrationLogEntryInterface[];
    getMigration(app_id: string, file: string): MigrationLogEntryInterface | undefined;
    isMigrated(app_id: string, file: string): boolean;
    isRolledBack(app_id: string, file: string): boolean;
}
export default MigrationLogger;
