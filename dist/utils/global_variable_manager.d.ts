declare class GlobalVariableManager {
    private static instance;
    private variables;
    private constructor();
    static getInstance(): GlobalVariableManager;
    setVariable(key: string, value: any): boolean;
    getVariable(key: string): any;
    updateVariable(key: string, value: any): boolean;
    listVariables(): Map<string, any>;
}
export default GlobalVariableManager;
