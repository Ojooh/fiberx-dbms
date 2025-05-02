declare const DataTypes: {
    STRING: (length?: number) => {
        type: string;
        length: number;
    };
    TEXT: (variant?: "tiny" | "medium" | "long") => {
        type: string;
        variant: "tiny" | "medium" | "long";
    };
    INTEGER: () => {
        type: string;
    };
    BIGINT: () => {
        type: string;
    };
    BOOLEAN: () => {
        type: string;
    };
    DATE: () => {
        type: string;
    };
    FLOAT: () => {
        type: string;
    };
    DECIMAL: (precision?: number, scale?: number) => {
        type: string;
        precision: number;
        scale: number;
    };
    JSON: () => {
        type: string;
    };
    ENUM: (...values: string[]) => {
        type: string;
        values: string[];
    };
    UUID: () => {
        type: string;
    };
};
export default DataTypes;
