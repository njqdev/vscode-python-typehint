import { anyClassOrFunctionName, PythonType } from "./python";

/**
 * The source of a type estimation.
 */
export enum EstimationSource { 
    ClassDefinition,
    FunctionDefinition,
    Value,
    ValueOfOtherVariable, 
}

/**
 * The result of a type search.
 */
export class VariableSearchResult {
    public typeName: string;
    public estimationSource: EstimationSource;
    public valueAssignment: string;

    constructor(typeName: string, estimationSource: EstimationSource, valueAssignment: string) {
        this.typeName = typeName;
        this.estimationSource = estimationSource;
        this.valueAssignment = valueAssignment;
    }

}

export class TypeSearch {

    
    /**
     * Searches for a class with the same name as object and returns the name if found.
     * 
     * @param object The object.
     * @param documentText The text to search
     */
    public static classWithSameName(object: string, documentText: string): string | null {
        const clsMatch = new RegExp(`^ *class +(${object})[(:]`, "mi").exec(documentText);
        return clsMatch ? clsMatch[1] : null;
    }

    /**
     * Searches for a variable with the same name as the param and detects its type.
     * 
     * @param param The parameter name.
     * @param documentText The source code of the document.
     * @returns A search result or null.
     */
    public static async variableWithSameName(param: string, documentText: string): Promise<VariableSearchResult | null> {
        let match = this.variableSearchRegExp(param).exec(documentText);
        if (!match) {
            return null;
        }
        const valueAssignment = match[1];

        let typeName = this.detectType(valueAssignment);
        if (typeName) {
            return new VariableSearchResult(typeName, EstimationSource.Value, valueAssignment);
        }
        
        match = new RegExp(`^ *(${anyClassOrFunctionName})\\(?`).exec(valueAssignment);
        if (!match) {
            return null;
        }

        if (match[0].endsWith("(")) {
            let value = match[1];
            if (this.classWithSameName(value, documentText)) {
                return new VariableSearchResult(value, EstimationSource.ClassDefinition, valueAssignment);
            }

            if (this.isProbablyAClass(value)) {
                if (!new RegExp(`^[ \t]*def ${value}\\(` ).test(documentText)) {
                    return new VariableSearchResult(value, EstimationSource.Value, valueAssignment);
                }
            } else {
                if (value.includes(".")) {
                    let split = value.split(".");
                    value = split[split.length - 1];
                }
                // Find the function definition and check if the return type is hinted
                const regExp = new RegExp(`^[ \t]*def ${value}\\([^)]*\\) *-> *([a-zA-Z_][a-zA-Z0-9_.\\[\\]]+)`, "m");

                const hintedCallMatch = regExp.exec(documentText);

                if (hintedCallMatch) {
                    if (hintedCallMatch.length === 2) {
                        return new VariableSearchResult(
                            hintedCallMatch[1],
                            EstimationSource.FunctionDefinition,
                            valueAssignment
                        );
                    }
                }
            }
            return null;
        }

        // Searching the import source document is not supported (yet?)
        if (!this.isImported(match[1], documentText.substr(match.index - match.length))) {
            
            if (match = this.variableSearchRegExp(match[1]).exec(documentText)) {
                const otherType = this.detectType(match[1]);
                return otherType 
                    ? new VariableSearchResult(otherType, EstimationSource.ValueOfOtherVariable, valueAssignment)
                    : null;
            }
        }
        return null;
    }

        /**
     * Detects the type of a value, if it is a built in Python type.
     * 
     * @returns The type name or null if not found.
     */
    public static detectType(value: string): string | null {
        const searches = [
            [ PythonType.List, `${PythonType.List}\\(`, `^ *\\[`],
            [ PythonType.Bool, `${PythonType.Bool}\\(`, `^ *(True|False)`],
            [ PythonType.Complex, `${PythonType.Complex}\\(`, `^ *[()0-9+*\\/ -.]*[0-9][jJ]`],
            [ PythonType.Float, `${PythonType.Float}\\(`, `^ *[-(]*[0-9+*\/ -]*\\.[0-9]`],
            [ PythonType.Tuple, `${PythonType.Tuple}\\(`, `^ *\\(([^'",)]+,| *"[^"]*" *,| *'[^']*' *,)`],
            [ PythonType.Set, `${PythonType.Set}\\(`, `^ *{( *"[^"]*" *[},]+| *'[^']*' *[},]+|[^:]+[}])`],
            [ PythonType.Dict, `${PythonType.Dict}\\(`, "^ *{"],
            [ PythonType.String, `${PythonType.String}\\(`, `^ *(['"]{2}|(\\( *)?"[^"]*"|(\\( *)?'[^']*')`],
            [ PythonType.Int, `${PythonType.Int}\\(`, `^ *[-(]*[0-9]`],
            [ PythonType.Object, `${PythonType.Object}\\(` ]
        ];
        value = value.trim();
        if (value.match("^[a-z]")) {
            for (const s of searches) {
                const typeName = s[0];
                if (new RegExp(s[1]).test(value)) {
                    return typeName;
                }
            }
        }
        searches.pop();
        for (const e of searches) {
            const typeName = e[0];
            if (new RegExp(e[2]).test(value)) {
                return typeName;
            }
        }
        return null;
    }

    /**
     * Searches for a previously hinted param with the same name.
     * 
     * @param param The parameter name.
     * @param documentText The document text to search.
     * @returns The type hint of the found parameter or null.
     */
    public static hintOfSimilarParam(param: string, documentText: string): string | null {
        const m = new RegExp(
            `^[ \t]*def ${anyClassOrFunctionName}\\([^)]*\\b${param}\\b: *([^), ]+)`, "m"
        ).exec(documentText);
        if (m) {
            let hint = m[1].trim();
            return hint ? hint : null;
        }
        return null;
    }

    /**
     * Searches the result for a terinary operator that might return 2 or more different types.
     * 
     * @param searchResult The search result.
     */
    public static invalidTernaryOperator(searchResult: VariableSearchResult): boolean {

        if (searchResult.estimationSource === EstimationSource.ClassDefinition) {
            return false;
        }
        const regExp = new RegExp(" if +[^ ]+ +else( +[^ ]+) *$");

        let ternaryMatch = regExp.exec(searchResult.valueAssignment);
        while (ternaryMatch) {
            const elseVar = ternaryMatch[1].trim();
            let elseTypeName = this.detectType(elseVar);
            
            if (elseTypeName) {
                ternaryMatch = regExp.exec(elseTypeName);
                if (!ternaryMatch) {
                    return searchResult.typeName !== elseTypeName;
                }
            } else {
                return false;
            }
        }
        return false;
    }

    /**
     * Detects if an object is imported.
     * 
     * @returns The imported value.
     */
    public static findImport(object: string, documentText: string, checkForAsImports: boolean = true): string | null {

        if (object.includes(".")) {
            const s = object.split(".");
            const type = s[s.length - 1];
            const module = s.slice(0, s.length - 1).join(".");

            let match = null;

            if (s.length === 2 && module !== type) {
                match = new RegExp(
                    `^[ \t]*import +${module}|^[ \t]*from ${anyClassOrFunctionName} import (${module})`, "m"
                ).exec(documentText);
                if (match) {    
                    // Return 'Object.Type' for 'from x import Object'
                    return match[1] ? `${match[1]}.${type}` : object;
                }
            }
            match = new RegExp(`^[ \t]*import +${module}|^[ \t]*from ${module} import (${type})`, "m")
                .exec(documentText);
            return match ? match[1] ? match[1] : object : null;
        }
        return this.isImported(object, documentText, checkForAsImports) ? object : null;
    }

    /**
     * Detects if an object is imported.
     * 
     * @returns The imported value.
     */
    private static isImported(object: string, documentText: string, checkForAsImports: boolean = true): boolean {

        let exp = `^[ \t]*(from +${anyClassOrFunctionName} +import +${object}`;
        if (checkForAsImports) {
            exp += `|from +${anyClassOrFunctionName} +import +${anyClassOrFunctionName} +as +${object}`;
        }
        exp += ")";
        return new RegExp(exp,"m").test(documentText);
    }

    private static isProbablyAClass(lineText: string): boolean {
        return new RegExp(`^([a-zA-Z0-9_]+\\.)*[A-Z]`, "m").test(lineText);
    }

    /**
     * Matches a line that contains 'variableName = (.+)'.  
     */
    private static variableSearchRegExp(variableName: string): RegExp {
        return new RegExp(`^[ \t]*${variableName} *= *(.+)$`, "m");
    }
}