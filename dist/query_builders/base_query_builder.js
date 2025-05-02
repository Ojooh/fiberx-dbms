"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BaseQueryBuilder {
    // Transaction control
    beginTransaction() { return 'START TRANSACTION'; }
    commitTransaction() { return 'COMMIT'; }
    rollbackTransaction() { return 'ROLLBACK'; }
}
exports.default = BaseQueryBuilder;
