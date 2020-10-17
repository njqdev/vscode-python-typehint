import * as assert from 'assert';
import { messageFor, TestCase } from "../../common";
import { TypeSearch } from "../../../src/typeSearch";

suite('TypeSearch.detectType', () => {

    test("detects ints", async () => {
        const expected = "int";
        
        let src = "11";
        let actual = TypeSearch.detectType(src);
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));

        src = "-11";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));

        src = "0b10";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));

        src = "0o10";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));

        src = "0x10";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));
    });
    
    
    test("detects floats", async () => {
        const expected = "float";

        let src = "12.3";
        let actual = TypeSearch.detectType(src);
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));

        src = ".3";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));

        src = "-.3";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));

        src = "1 + 2 - 1 * 2 /  2.0";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));
    });

    test("detects complex numbers", async () => {
        const expected = "complex";

        let src = "0+1.1-2*3/4j";
        let actual = TypeSearch.detectType(src);
        assert.strictEqual(actual, expected);

    });

    test("detects strings", async () => {
        const expected = "str";

        let src = "'test'";
        let actual = TypeSearch.detectType(src);
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));

        src = "\"test\"'";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));

        src = "('test')";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));

        src = "'''t\nest''')";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));
    });

    test("detects bools", async () => {
        const expected = "bool";

        let src = "True";
        let actual = TypeSearch.detectType(src);
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));

        src = "False";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));
    });
    
    test("detects lists", async () => {
        const expected = "list";

        let src = "[";
        let actual = TypeSearch.detectType(src);
        assert.strictEqual(actual, expected);
    });

    test("detects dicts", async () => {
        const expected = "dict";

        let src = "{ 5: 'j'}";
        let actual = TypeSearch.detectType(src);
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));

        src = "{ (1,2): (3) }";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));

        src = "{'':11}";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));
    });

    test("detects tuples", async () => {
        const expected = "tuple";

        let src = "('dont return str please', 'ok')";
        let actual = TypeSearch.detectType(src);
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));

        src = " ( '4' , '5' )";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));
    });

    test("detects sets", async () => {
        const expected = "set";

        let src = "{'dont return dict or string please'}";
        let actual = TypeSearch.detectType(src);
        assert.strictEqual(actual, expected);

        src = "{1, 2}";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));

        src = "{1 , 2}";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));
    });

    test("detects bytes", async () => {
        const expected = "bytes";

        let src = "b'dont return string please'";
        let actual = TypeSearch.detectType(src);
        assert.strictEqual(actual, expected);

        src = 'b"dont return string please"';
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));

        src = "b'''hi'''";
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));

        src = 'b"""hi"""';
        actual = TypeSearch.detectType(src);
        assert.strictEqual(TypeSearch.detectType(src), expected, messageFor(src, expected, actual));
    });
    
    test("detects type() call", () => {
        const testCases: TestCase[] = [
            { data: "int('2')", expected: "int" },
            { data: "bool('true')", expected: "bool" },
            { data: "list(foo)", expected: "list" },
            { data: "dict(foo)", expected: "dict" },
            { data: "tuple(foo)", expected: "tuple" },
            { data: "str(1)", expected: "str" },
            { data: "set([1])", expected: "set" },
            { data: "bytes('hi', encoding='utf-8')", expected: "bytes" }
        ];
        for (const c of testCases) {
            let actual = TypeSearch.detectType(c.data);
            assert.strictEqual(actual, c.expected);
        }
    });

    test("ignores spaces", async () => {
        const expected = "int";

        let src = "        5";
        let actual = TypeSearch.detectType(src);
        assert.strictEqual(actual, expected);
    });
});

suite('TypeSearch.variableWithSameName', function() {

    test("detects class if defined in the document", async () => {
        const expected = "test_class";
        const line = "var = test_class()";
        let src = `class ${expected}:\n\tpass\n${line}`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);

        assert.strictEqual(actual?.typeName, expected, messageFor(src, expected, actual));
    });

    test("detects variable types if initialized in the document", async () => {
        const expected = "int";
        const line = "var = x";

        // Variable with the same name initialized above
        let src = `${line}\n\ndef main():\n\tx = 5`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.strictEqual(actual?.typeName, expected, messageFor(src, expected, actual));

        // Variable with the same name initialized below
        src = `x = 5\n${line}`;
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.strictEqual(actual?.typeName, expected, messageFor(src, expected, actual));
    });

    test("considers value to be an object initializtion if title case", async () => {
        let expected = "TestClass";
        let src = `var = ${expected}(x)`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.strictEqual(actual?.typeName, expected, messageFor(src, expected, actual));

        expected = "test.test.TestClass";
        src = `var = ${expected}(x)`;
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.strictEqual(actual?.typeName, expected, messageFor(src, expected, actual));
    });

    test("returns null for title case functions (if the function is defined in the document)", async () => {
        const expected = null;
        const line = "var = Func(x)";

        let src = `def Func(x):\n\tpass\n\n${line}`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.strictEqual(actual, expected);
    });

    test("detects function return values if type hinted", async () => {
        const expected = "int";
        let src = "def test() -> int:\n\treturn 1\n\nvar = test()";
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.strictEqual(actual?.typeName, expected, messageFor(src, expected, actual));

        src = "def test(self) -> int:\n\treturn 1\n\nvar = cls.test()";
        actual = await TypeSearch.variableWithSameName(param, src);
        assert.strictEqual(actual?.typeName, expected, messageFor(src, expected, actual));
    });
    
    test("doesn't consider function calls to be variables", async () => {
        const expected = null;
        let src = `obj = call()`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.strictEqual(actual, expected);
    });

    test("ignores single-line comments", async () => {
        const expected = null;
        let line = "var = obj";
        let src = `# obj = 5\n${line}`;
        let param = "var";
        let actual = await TypeSearch.variableWithSameName(param, src);
        assert.strictEqual(actual, expected);
    });
});