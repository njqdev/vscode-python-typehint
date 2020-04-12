import * as assert from 'assert';
import { TypeSearch } from "../../src/typeSearch";
import { getErrorMessage } from '../common';

suite('CodeSearch.findImport', function() {

    test("finds from x import", () => {
        
        let detectedType = "var";
        let expected = detectedType;
        let src = "import something\nfrom something import " + expected;
        let actual = TypeSearch.findImport(detectedType, src, false);
        assert.equal(actual, expected);
    });

    test("finds from x import y as z", () => {
        
        let detectedType = "var";
        let expected = detectedType;
        let src = "from pkg import y as " + expected;
        let actual = TypeSearch.findImport(detectedType, src, true);
        assert.equal(actual, expected);
    });

    test("detects import x.y and returns x.y.Type.", () => {
        
        let detectedType = "package.x.y_test.Type";
        let expected = detectedType;
        let src = "import package.x.y_test";
        let actual = TypeSearch.findImport(detectedType, src, false);
        assert.equal(actual, expected);
    });
    
    test("module.Type --> returns Type for from module import Type", () => {
        
        let detectedType = "module.Type";
        let expected = "Type";
        let src = "from module import " + expected;
        let actual = TypeSearch.findImport(detectedType, src, false);
        assert.equal(actual, expected, getErrorMessage({ data: src, expected }, actual));

        detectedType = "package.x.y_test.Type";
        src = "from package.x.y_test import " + expected;
        actual = TypeSearch.findImport(detectedType, src, false);
        assert.equal(actual, expected, getErrorMessage({ data: src, expected }, actual));
    });

    test("object.Type --> returns object.Type for from X import object", () => {
        
        let detectedType = "obj.Type";
        let expected = detectedType;
        let src = "from package import obj";
        let actual = TypeSearch.findImport(detectedType, src, false);
        assert.equal(actual, expected);      
    });


    test("ignores extra spaces and tabs", () => {
        
        let detectedType = "var";
        let expected = detectedType;
        let src = "def x():\n\t    from    pkg     import " + expected;
        let actual = TypeSearch.findImport(detectedType, src, false);
        assert.equal(actual, expected);
    });

});