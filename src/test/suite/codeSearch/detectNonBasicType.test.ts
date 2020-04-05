import * as assert from 'assert';
import { getErrorMessage } from "../common";
import { CodeSearch } from "../../../codeSearch";

suite('CodeSearch.detectType (non-basic types)', function() {

    test("detects class if defined in the document", async () => {
        const expected = "test_class";
        const line = "var = test_class()";
        let src = `class ${expected}:\n\tpass\n${line}`;
        let actual = await CodeSearch.detectType(line, src);

        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("detects variable types if initialized in the document", async () => {
        const expected = "int";
        const line = "var = x";

        // Variable with the same name initialized above
        let src = `${line}\n\ndef main():\n\tx = 5`;
        let actual = await CodeSearch.detectType(line, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        // Variable with the same name initialized below
        src = `x = 5\n${line}`;
        actual = await CodeSearch.detectType(line, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("considers value to be an object initializtion if title case", async () => {
        let expected = "TestClass";
        let src = `var = ${expected}(x)`;
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));

        expected = "test.test.TestClass";
        src = `var = ${expected}(x)`;
        actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("returns null for title case functions (if the function is defined in the document)", async () => {
        const expected = null;
        const line = "var = Func(x)";

        let src = `def Func(x):\n\tpass\n\n${line}`;
        let actual = await CodeSearch.detectType(line, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("detects function return values if type hinted", async () => {
        const expected = "int";
        let line = "var = test()";
        let src = "def test() -> int:\n\treturn 1\n\nvar = test()";
        let actual = await CodeSearch.detectType(line, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });
    
    test("doesn't consider function calls to be variables", async () => {
        const expected = null;
        let src = `obj = call()`;
        let actual = await CodeSearch.detectType(src, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

    test("ignores single-line comments", async () => {
        const expected = null;
        let line = "var = obj";
        let src = `# obj = 5\n${line}`;
        let actual = await CodeSearch.detectType(line, src);
        assert.equal(actual?.typeName, expected, getErrorMessage(src, expected, actual?.typeName));
    });

});