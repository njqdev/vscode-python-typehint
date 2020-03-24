

export const getErrorMessage = (
    testCase: string,
    expected: any,
    actual: any
): string => {
   return `${actual} == ${expected}. \n[Test case]: ${testCase}`;
};

export interface TestCase {
    data: any,
    expected: any
}