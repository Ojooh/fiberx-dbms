"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
class GitUtil {
    constructor(repository_branch, working_directory = path_1.default.resolve(__dirname, "../")) {
        this.working_directory = working_directory;
        this.repository_branch = repository_branch;
    }
    async runCommand(command) {
        try {
            return new Promise((resolve, reject) => {
                (0, child_process_1.exec)(command, { cwd: this.working_directory }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`❌ Command failed: ${command}`);
                        console.error(stderr);
                        reject(error);
                    }
                    else {
                        resolve(stdout.trim());
                    }
                });
            });
        }
        catch (error) {
            console.error(`❌ Command failed: ${command}`);
            console.error(error.stderr || error.message);
            throw error;
        }
    }
    async pullLatest() {
        try {
            console.log(this.working_directory);
            console.log("[Git] Pulling latest changes...");
            await this.runCommand(`git pull origin ${this.repository_branch}`);
            console.log("[Git] ✅ Pull complete.");
            return true;
        }
        catch (err) {
            console.error("[Git] ❌ Pull failed:", err);
            return false;
        }
    }
    async commitAndPush(message) {
        try {
            console.log("[Git] Committing and pushing changes...");
            await this.runCommand(`git add schemas`);
            await this.runCommand(`git add migrations`);
            await this.runCommand(`git commit -m "${message}"`);
            await this.runCommand(`git push origin ${this.repository_branch}`);
            console.log("[Git] ✅ Commit and push successful.");
            return true;
        }
        catch (err) {
            if (err.message.includes("nothing to commit")) {
                console.log("[Git] ✅ No changes to commit.");
                return true;
            }
            else {
                console.error("[Git] ❌ Commit/push failed:", err);
                return false;
            }
        }
    }
}
exports.default = GitUtil;
