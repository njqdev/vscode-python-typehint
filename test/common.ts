import { VariableSearchResult, EstimationSource } from "../src/typeSearch";

export interface TestCase {
    data: any,
    expected: any
}

export class SetupError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SetupError";
    }
}

export function messageFor(testData: any, expected: any, actual: any): string {
   return `${actual} == ${expected}. \n[Test data]\n${testData}`;
};

export function varSearchResult(typeName: string, valueAssignment: string): VariableSearchResult {
    return { typeName, estimationSource: EstimationSource.Value, valueAssignment };
};