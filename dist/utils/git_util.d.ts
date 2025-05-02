declare class GitUtil {
    private working_directory;
    private repository_branch;
    constructor(repository_branch: string, working_directory?: string);
    private runCommand;
    pullLatest(): Promise<boolean>;
    commitAndPush(message: string): Promise<boolean>;
}
export default GitUtil;
