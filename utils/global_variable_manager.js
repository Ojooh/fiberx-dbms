class GlobalVariableManager {
    constructor() { 
        this.variables = new Map(); 
    }

    // Method to get the single instance of the GlobalVariableManager
    static getInstance = () => {
        if (!GlobalVariableManager.instance) {
            GlobalVariableManager.instance = new GlobalVariableManager();
        }
        
        return GlobalVariableManager.instance;
    }

    // Set a global variable, ensuring it's a constant once set
    setVariable = (key, value) => {
        if (this.variables.has(key)) {
            console.error(`Variable ${key} is already set and cannot be changed.`);
            return false;
        }
        this.variables.set(key, value);
        return true;
    }

    // Get a global variable by key
    getVariable = (key) => {
        if (!this.variables.has(key)) {
            console.error(`Variable ${key} not found.`);
            return null;
        }
        return this.variables.get(key);
    }

    // Update a global variable if needed (but this method could be made more restrictive)
    updateVariable = (key, value) => {
        if (!this.variables.has(key)) {
            console.error(`Variable ${key} does not exist.`);
            return false;
        }
        this.variables.set(key, value);
        return true;
    }

    // Optional: To list all the current global variables
    listVariables = () => { return this.variables; }
}

module.exports = GlobalVariableManager;
