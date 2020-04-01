import * as assert from 'assert';
import { getErrorMessage, TestCase } from "../common";
import { detectBasicType } from "../../../codeSearch";

suite('detectBasicType', function() {

    // Test for when false is passed to the function
    // If this fails, tests of dependent functions might fail as well
    test("detects type of a lone values", () => {
        
        const testCases: TestCase[] = [
            { data: "2", expected: "int"},
            { data: "True", expected: "bool"},
            { data: "[]", expected: "list"},
            { data: "{}", expected: "dict"},
            { data: "(1, 2)", expected: "tuple"},
            { data: "'str'", expected: "str"}
        ];
        for (const c of testCases) {
            assert.equal(detectBasicType(c.data, false), c.expected);
        }
    });

    test("detects ints", () => {
        const expected = "int";
        
        let src = "var = 11";
        let actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = -11";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = 0b10";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = 0o10";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = 0x10";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));
    });
    
    
    test("detects floats", () => {
        const expected = "float";

        let src = "var = 12.3";
        let actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = .3";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = -.3";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = 1 + 2 - 1 * 2 /  2.0";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));
    });

    test("detects complex numbers", () => {
        const expected = "complex";

        let src = "var = 0+1.1-2*3/4j";
        let actual = detectBasicType(src);
        assert.equal(actual, expected);

    });

    test("detects strings", () => {
        const expected = "str";

        let src = "var = 'test'";
        let actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = \"test\"'";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = ('test')";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = '''t\nest''')";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));
    });

    test("detects bools", () => {
        const expected = "bool";

        let src = "var = True";
        let actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = False";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));
    });
    
    test("detects lists", () => {
        const expected = "list";

        let src = "var = [";
        let actual = detectBasicType(src);
        assert.equal(actual, expected);
    });

    test("detects dicts", () => {
        const expected = "dict";

        let src = "var = {";
        let actual = detectBasicType(src);
        assert.equal(actual, expected);
    });

    test("detects tuples", () => {
        const expected = "tuple";

        let src = "var = ('dont return str please', 'ok')";
        let actual = detectBasicType(src);
        assert.equal(actual, expected);
    });

    test("detects sets", () => {
        const expected = "set";

        let src = "var = {'dont return dict please'}";
        let actual = detectBasicType(src);
        assert.equal(actual, expected);

        src = "var = {1, 2}";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        src = "var = {1 , 2}";
        actual = detectBasicType(src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));
    });
    
    test("detects type() call", () => {
        const testCases: TestCase[] = [
            { data: "var = int('2')", expected: "int"},
            { data: "var = bool(true)", expected: "bool"},
            { data: "var = list(foo)", expected: "list"},
            { data: "var = dict(foo)", expected: "dict"},
            { data: "var = tuple(foo)", expected: "tuple"},
            { data: "var = str(1)", expected: "str"},
            { data: "var = set([1])", expected: "set"}
        ];
        for (const c of testCases) {
            assert.equal(detectBasicType(c.data), c.expected);
        }
    });

    test("ignores spaces", () => {
        const expected = "int";

        let src = "var       =        5";
        let actual = detectBasicType(src);
        assert.equal(actual, expected);
    });
});