"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const uuid_generator_util_1 = __importDefault(require("./uuid_generator_util"));
class MigrationLogger {
    constructor() {
        this.yaml_log_file_path = './app_configs/migration_logs.yaml';
        this.uuid_generator_util = new uuid_generator_util_1.default();
    }
    // Load logs from YAML file
    readMigrationLogs() {
        if (!fs.existsSync(this.yaml_log_file_path))
            return [];
        const file_content = fs.readFileSync(this.yaml_log_file_path, 'utf8');
        const data = yaml.load(file_content);
        return data?.migrations || [];
    }
    // Write logs to YAML file
    writeMigrationLogs(logs) {
        const data = { migrations: logs };
        const yaml_content = yaml.dump(data);
        fs.writeFileSync(this.yaml_log_file_path, yaml_content, 'utf8');
    }
    // Log new migration entry
    logMigration(app_id, file, status, error_message) {
        const logs = this.readMigrationLogs();
        const existing = logs.find(log => log.app_id === app_id && log.file === file);
        const now = new Date().toISOString();
        if (existing) {
            existing.status = status;
            existing.updated_at = now;
            existing.error_message = error_message;
        }
        else {
            const id = this.uuid_generator_util.generateUUIDV2("MIG");
            const new_entry = { id, app_id, file, status, created_at: now, updated_at: now, error_message };
            logs.push(new_entry);
        }
        this.writeMigrationLogs(logs);
        return existing || logs[logs.length - 1];
    }
    // Get all migration logs
    listMigrationLogs() { return this.readMigrationLogs(); }
    // Get logs for a specific app
    getAppMigrations(app_id) { return this.readMigrationLogs().filter(log => log.app_id === app_id); }
    // Get a specific migration log entry
    getMigration(app_id, file) { return this.readMigrationLogs().find(log => log.app_id === app_id && log.file === file); }
    isMigrated(app_id, file) {
        const migration_record = this.getMigration(app_id, file);
        if (migration_record && migration_record.status === "migrated") {
            return true;
        }
        return false;
    }
    isRolledBack(app_id, file) {
        const migration_record = this.getMigration(app_id, file);
        if (migration_record && migration_record.status === "rolledback") {
            return true;
        }
        return false;
    }
}
exports.default = MigrationLogger;
