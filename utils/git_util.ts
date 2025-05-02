import { exec } from "child_process";
import path from "path";

class GitUtil {
    private working_directory: string;
    private repository_branch: string;

    constructor(repository_branch: string, working_directory: string = path.resolve(__dirname, "../../")) {
        this.working_directory  = working_directory;
        this.repository_branch  = repository_branch
    }

    private async runCommand(command: string): Promise<string> {
        try {
            return new Promise((resolve, reject) => {
                exec(
                    command, 
                    { cwd: this.working_directory }, 
                    (error, stdout, stderr) => {
                        if (error) {
                            console.error(`❌ Command failed: ${command}`);
                            console.error(stderr);
                            reject(error);
                        } 
                        else { resolve(stdout.trim()); }
                    }
                );
            });
        } 
        catch (error: any) {
            console.error(`❌ Command failed: ${command}`);
            console.error(error.stderr || error.message);
            throw error;
        }
    }

    public async pullLatest(): Promise<boolean> {
        try {
            console.log("[Git] Pulling latest changes...");
            await this.runCommand(`git pull origin ${this.repository_branch}`);
            console.log("[Git] ✅ Pull complete.");
            return true;
        } catch (err) {
            console.error("[Git] ❌ Pull failed:", err);
            return false;
        }
    }

    public async commitAndPush(message: string): Promise<boolean> {
        try {
            console.log("[Git] Committing and pushing changes...");
            await this.runCommand(`git add schemas`);
            await this.runCommand(`git add migrations`);
            await this.runCommand(`git commit -m "${message}"`);
            await this.runCommand(`git push origin ${this.repository_branch}`);
            console.log("[Git] ✅ Commit and push successful.");
            return true;
        } 
        catch (err: any) {
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

export default GitUtil;
