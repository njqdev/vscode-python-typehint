

export const getErrorMessage = (
    testCase: TestCase,
    actual: any
): string => {
   return `${actual} == ${testCase.expected}. \n[Test data]: ${testCase.data}`;
};

export interface TestCase {
    data: any,
    expected: any
}