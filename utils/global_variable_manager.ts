class GlobalVariableManager {
    private static instance: GlobalVariableManager;
    private variables: Map<string, any>;

    // Private constructor to prevent multiple instances
    private constructor() { this.variables = new Map(); }

    // Method to get the single instance of the GlobalVariableManager
    public static getInstance(): GlobalVariableManager {
        if (!GlobalVariableManager.instance) {
            GlobalVariableManager.instance = new GlobalVariableManager();
        }

        return GlobalVariableManager.instance;
    }

    // Set a global variable, ensuring it's a constant once set
    public setVariable(key: string, value: any): boolean {
        if (this.variables.has(key)) {
            console.error(`Variable ${key} is already set and cannot be changed.`);
            return false;
        }
        this.variables.set(key, value);
        return true;
    }

    // Get a global variable by key
    public getVariable(key: string): any {
        if (!this.variables.has(key)) {
            console.error(`Variable ${key} not found.`);
            return null;
        }
        return this.variables.get(key);
    }

    // Update a global variable if needed (but this method could be made more restrictive)
    public updateVariable(key: string, value: any): boolean {
        if (!this.variables.has(key)) {
            console.error(`Variable ${key} does not exist.`);
            return false;
        }
        this.variables.set(key, value);
        return true;
    }

    // Optional: To list all the current global variables
    public listVariables(): Map<string, any> { return this.variables; }
}

export default GlobalVariableManager;
