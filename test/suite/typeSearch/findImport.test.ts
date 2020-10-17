import * as assert from 'assert';
import { TypeSearch } from "../../../src/typeSearch";
import { messageFor } from '../../common';

suite('TypeSearch.findImport', () => {

    test("finds import x", () => {
        let value = "module_x.Type";
        let expected = value;
        let src = "import module_x";
        let actual = TypeSearch.findImport(value, src, false);
        assert.strictEqual(actual, expected);
    });

    test("finds import x.y", () => {
        let value = "package.x.y.Type";
        let expected = value;
        let src = "import package.x.y";
        let actual = TypeSearch.findImport(value, src, false);
        assert.strictEqual(actual, expected);
    });

    test("finds import x.y.(...)z", () => {
        let value = "package.x.y.z.a.Type";
        let expected = value;
        let src = "import package.x.y.z.a";
        let actual = TypeSearch.findImport(value, src, false);
        assert.strictEqual(actual, expected);
    });

    test("finds from x import", () => {
        let value = "var";
        let expected = value;
        let src = "import something\nfrom something import " + expected;
        let actual = TypeSearch.findImport(value, src, false);
        assert.strictEqual(actual, expected);
    });

    test("finds from x import y as z", () => {
        let value = "var";
        let expected = value;
        let src = "from pkg import y as " + expected;
        let actual = TypeSearch.findImport(value, src, true);
        assert.strictEqual(actual, expected);
    });

    
    test("value == module.Type --> returns Type for 'from module import Type'", () => {
        let value = "module.Type";
        let expected = "Type";
        let src = "from module import " + expected;
        let actual = TypeSearch.findImport(value, src, false);
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));

        value = "package.x.y_test.Type";
        src = "from package.x.y_test import " + expected;
        actual = TypeSearch.findImport(value, src, false);
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));
    });

    test("value == x.Type --> returns x.Type for 'from y import x'", () => {
        let value = "x.Type";
        let expected = value;
        let src = "from y import x";
        let actual = TypeSearch.findImport(value, src, false);
        assert.strictEqual(actual, expected); 
    });

    test("ignores extra spaces and tabs", () => {
        let value = "var";
        let expected = value;
        let src = "def x():\n\t    from    pkg     import " + expected;
        let actual = TypeSearch.findImport(value, src, false);
        assert.strictEqual(actual, expected);
    });

});