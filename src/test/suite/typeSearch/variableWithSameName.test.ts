import * as assert from 'assert';
import { getErrorMessage, TestCase } from "../common";
import { TypeSearch } from "../../../typeSearch";

/**
 * Tests basic type detection by CodeSearch.detectBasicType.
 */
suite('CodeSearch.variableWithSameName (basic type detection)', function() {

    test("detects ints", async () => {
        const expected = "int";
        
        let src = "var = 11";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = -11";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = 0b10";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = 0o10";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = 0x10";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });
    
    
    test("detects floats", async () => {
        const expected = "float";

        let src = "var = 12.3";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = .3";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = -.3";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = 1 + 2 - 1 * 2 /  2.0";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("detects complex numbers", async () => {
        const expected = "complex";

        let src = "var = 0+1.1-2*3/4j";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected);

    });

    test("detects strings", async () => {
        const expected = "str";

        let src = "var = 'test'";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = \"test\"'";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = ('test')";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = '''t\nest''')";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("detects bools", async () => {
        const expected = "bool";

        let src = "var = True";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = False";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });
    
    test("detects lists", async () => {
        const expected = "list";

        let src = "var = [";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected);
    });

    test("detects dicts", async () => {
        const expected = "dict";

        let src = "var = {";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected);
    });

    test("detects tuples", async () => {
        const expected = "tuple";

        let src = "var = ('dont return str please', 'ok')";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected);
    });

    test("detects sets", async () => {
        const expected = "set";

        let src = "var = {'dont return dict or string please'}";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected);

        src = "var = {1, 2}";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        src = "var = {1 , 2}";
        actual = await TypeSearch.variableWithSameName(param, src);
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
            let actual = await TypeSearch.variableWithSameName("var", c.data);
            assert.equal(actual?.typeName, c.expected);
        }
    });

    test("ignores spaces", async () => {
        const expected = "int";

        let src = "var       =        5";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected);
    });
});

suite('CodeSearch.variableWithSameName (non-basic type detection)', function() {

    test("detects class if defined in the document", async () => {
        const expected = "test_class";
        const line = "var = test_class()";
        let src = `class ${expected}:\n\tpass\n${line}`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);

        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("detects variable types if initialized in the document", async () => {
        const expected = "int";
        const line = "var = x";

        // Variable with the same name initialized above
        let src = `${line}\n\ndef main():\n\tx = 5`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        // Variable with the same name initialized below
        src = `x = 5\n${line}`;
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("considers value to be an object initializtion if title case", async () => {
        let expected = "TestClass";
        let src = `var = ${expected}(x)`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        expected = "test.test.TestClass";
        src = `var = ${expected}(x)`;
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("returns null for title case functions (if the function is defined in the document)", async () => {
        const expected = null;
        const line = "var = Func(x)";

        let src = `def Func(x):\n\tpass\n\n${line}`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("detects function return values if type hinted", async () => {
        const expected = "int";
        let line = "var = test()";
        let src = "def test() -> int:\n\treturn 1\n\nvar = test()";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });
    
    test("doesn't consider function calls to be variables", async () => {
        const expected = null;
        let src = `obj = call()`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("ignores single-line comments", async () => {
        const expected = null;
        let line = "var = obj";
        let src = `# obj = 5\n${line}`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });
});