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

export function messageFor(testCase: TestCase, actual: any): string {
   return `${actual} == ${testCase.expected}. \n[Test data]\n${testCase.data}`;
};

export function varSearchResult(typeName: string, valueAssignment: string): VariableSearchResult {
    return { typeName, estimationSource: EstimationSource.Value, valueAssignment };
};