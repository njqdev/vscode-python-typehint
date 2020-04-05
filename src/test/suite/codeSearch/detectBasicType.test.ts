import * as assert from 'assert';
import { getErrorMessage, TestCase } from "../common";
import { CodeSearch } from "../../../codeSearch";

/**
 * Tests basic type detection by CodeSearch.detectBasicType.
 */
suite('CodeSearch.detectType (basic types)', function() {

    test("detects ints", async () => {
        const expected = "int";
        
        let src = "var = 11";
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = -11";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = 0b10";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = 0o10";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = 0x10";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });
    
    
    test("detects floats", async () => {
        const expected = "float";

        let src = "var = 12.3";
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = .3";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = -.3";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = 1 + 2 - 1 * 2 /  2.0";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("detects complex numbers", async () => {
        const expected = "complex";

        let src = "var = 0+1.1-2*3/4j";
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected);

    });

    test("detects strings", async () => {
        const expected = "str";

        let src = "var = 'test'";
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = \"test\"'";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = ('test')";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = '''t\nest''')";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("detects bools", async () => {
        const expected = "bool";

        let src = "var = True";
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = False";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });
    
    test("detects lists", async () => {
        const expected = "list";

        let src = "var = [";
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected);
    });

    test("detects dicts", async () => {
        const expected = "dict";

        let src = "var = {";
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected);
    });

    test("detects tuples", async () => {
        const expected = "tuple";

        let src = "var = ('dont return str please', 'ok')";
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected);
    });

    test("detects sets", async () => {
        const expected = "set";

        let src = "var = {'dont return dict please'}";
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected);

        src = "var = {1, 2}";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = {1 , 2}";
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });
    
    test("detects type() call", async () => {
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
            let actual = await CodeSearch.detectType(c.data, c.data);
            assert.equal(actual?.typeName, c.expected);
        }
    });

    test("ignores spaces", async () => {
        const expected = "int";

        let src = "var       =        5";
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected);
    });
});