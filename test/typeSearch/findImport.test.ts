import * as assert from 'assert';
import { TypeSearch } from "../../src/typeSearch";
import { messageFor } from '../common';

suite('TypeSearch.findImport', () => {

    test("finds from x import", () => {
        let value = "var";
        let expected = value;
        let src = "import something\nfrom something import " + expected;
        let actual = TypeSearch.findImport(value, src, false);
        assert.equal(actual, expected);
    });

    test("finds from x import y as z", () => {
        let value = "var";
        let expected = value;
        let src = "from pkg import y as " + expected;
        let actual = TypeSearch.findImport(value, src, true);
        assert.equal(actual, expected);
    });

    test("detects import x.y and returns x.y.Type.", () => {
        let value = "package.x.y_test.Type";
        let expected = value;
        let src = "import package.x.y_test";
        let actual = TypeSearch.findImport(value, src, false);
        assert.equal(actual, expected);
    });
    
    test("module.Type --> returns Type for from module import Type", () => {
        let value = "module.Type";
        let expected = "Type";
        let src = "from module import " + expected;
        let actual = TypeSearch.findImport(value, src, false);
        assert.equal(actual, expected, messageFor({ data: src, expected }, actual));

        value = "package.x.y_test.Type";
        src = "from package.x.y_test import " + expected;
        actual = TypeSearch.findImport(value, src, false);
        assert.equal(actual, expected, messageFor({ data: src, expected }, actual));
    });

    test("object.Type --> returns object.Type for from X import object", () => {
        let value = "obj.Type";
        let expected = value;
        let src = "from package import obj";
        let actual = TypeSearch.findImport(value, src, false);
        assert.equal(actual, expected);      
    });


    test("ignores extra spaces and tabs", () => {
        let value = "var";
        let expected = value;
        let src = "def x():\n\t    from    pkg     import " + expected;
        let actual = TypeSearch.findImport(value, src, false);
        assert.equal(actual, expected);
    });

});