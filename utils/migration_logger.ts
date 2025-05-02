import * as fs from "fs";
import * as yaml from "js-yaml";
import UUIDGeneratorUtil from "@/utils/uuid_generator_util";

import { MigrationLogEntryInterface, MigrationStatusType } from "@/types/common_types";

class MigrationLogger {
    private yaml_log_file_path: string = './app_configs/migration_logs.yaml';
    private uuid_generator_util: UUIDGeneratorUtil;

    constructor() {
        this.uuid_generator_util = new UUIDGeneratorUtil();
    }

    // Load logs from YAML file
    private readMigrationLogs(): MigrationLogEntryInterface[] {
        if (!fs.existsSync(this.yaml_log_file_path)) return [];

        const file_content  = fs.readFileSync(this.yaml_log_file_path, 'utf8');
        const data          = yaml.load(file_content) as { migrations: MigrationLogEntryInterface[] };

        return data?.migrations || [];
    }

    // Write logs to YAML file
    private writeMigrationLogs(logs: MigrationLogEntryInterface[]): void {
        const data              = { migrations: logs };
        const yaml_content      = yaml.dump(data);
        fs.writeFileSync(this.yaml_log_file_path, yaml_content, 'utf8');
    }

    // Log new migration entry
    logMigration(app_id: string, file: string, status: MigrationStatusType, error_message?: string): MigrationLogEntryInterface {
        const logs          = this.readMigrationLogs();
        const existing      = logs.find(log => log.app_id === app_id && log.file === file);
        const now           = new Date().toISOString();

        if (existing) {
            existing.status         = status;
            existing.updated_at     = now;
            existing.error_message  = error_message;
        } 
        else {
            const id = this.uuid_generator_util.generateUUIDV2("MIG")
            const new_entry: MigrationLogEntryInterface = { id, app_id, file, status, created_at: now, updated_at: now, error_message };
            logs.push(new_entry);
        }

        this.writeMigrationLogs(logs);

        return existing || logs[logs.length - 1];
    }

    // Get all migration logs
    listMigrationLogs(): MigrationLogEntryInterface[] { return this.readMigrationLogs(); }

    // Get logs for a specific app
    getAppMigrations(app_id: string): MigrationLogEntryInterface[] { return this.readMigrationLogs().filter(log => log.app_id === app_id); }

    // Get a specific migration log entry
    getMigration(app_id: string, file: string): MigrationLogEntryInterface | undefined { return this.readMigrationLogs().find(log => log.app_id === app_id && log.file === file); }

    isMigrated(app_id: string, file: string): boolean { 
        const migration_record  = this.getMigration(app_id, file);

        if(migration_record && migration_record.status === "migrated") { return true }

        return false
    } 

    isRolledBack(app_id: string, file: string): boolean { 
        const migration_record  = this.getMigration(app_id, file);

        if(migration_record && migration_record.status === "rolledback") { return true }

        return false
    } 
}

export default MigrationLogger;
