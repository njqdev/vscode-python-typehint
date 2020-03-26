import * as assert from 'assert';
import { getErrorMessage } from "../common";
import { detectNonBasicType } from "../../../codeSearch";

suite('detectNonBasicType', function() {

    test("detects class if defined in the document", () => {
        const expected = "test_class";
        const line = "var = test_class()";
        let src = `class ${expected}:\n\tpass\n${line}`;
        let actual = detectNonBasicType(line, src);

        assert.equal(actual, expected, getErrorMessage(src, expected, actual));
    });

    test("detects variable types if initialized in the document", () => {
        const expected = "int";
        const line = "var = x";

        // Variable with the same name initialized above
        let src = `${line}\n\ndef main():\n\tx = 5`;
        let actual = detectNonBasicType(line, src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        // Variable with the same name initialized below
        src = `x = 5\n${line}`;
        actual = detectNonBasicType(line, src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));
    });

    test("considers value to be an object initializtion if title case", () => {
        let expected = "TestClass";
        let src = `var = ${expected}(x)`;
        let actual = detectNonBasicType(src, src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));

        expected = "test.test.TestClass";
        src = `var = ${expected}(x)`;
        actual = detectNonBasicType(src, src);
        assert.equal(actual, expected, getErrorMessage(src, expected, actual));
    });

    test("returns null for title case functions (if the function is defined in the document)", () => {
        const expected = null;
        const line = "var = Func(x)";

        let src = `def Func(x):\n\tpass\n\n${line}`;
        let actual = detectNonBasicType(line, src);
        assert.equal(actual, expected);
    });

    test("detects function return types if type hinted",
    () => {
        const expected = "int";
        let line = "var = test()";
        let src = "def test() -> int:\n\treturn 1\n\nvar = test()";
        let actual = detectNonBasicType(line, src);
        assert.equal(actual, expected);
    });
    
    test("doesn't consider function calls to be variables", () => {
        const expected = null;
        let src = `obj = call()`;
        let actual = detectNonBasicType(src, src);
        assert.equal(actual, expected);
    });

    test("ignores single-line comments", () => {
        const expected = null;
        let line = "var = obj";
        let src = `# obj = 5\n${line}`;
        let actual = detectNonBasicType(line, src);
        assert.equal(actual, expected);
    });

});