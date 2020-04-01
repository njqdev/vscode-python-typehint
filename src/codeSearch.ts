import { anyTypeName, Types } from "./python";


export interface TypeSearchResult {
    typeName: string | null;
        
}

/**
 * Detects the type of an initialized variable.
 * 
 * @param src The line of code or value to detect a type for.
 * @param srcIsLineOfCode Determine the type from a line of code.
 * @returns The type or null if not found.
 */
export function detectBasicType(src: string, srcIsLineOfCode = true): string | null {

    for (const typeName of typeSearchOrder) {
        let r = typeSearchRegExp(typeName, srcIsLineOfCode ? "= *" : "");
        if (r.test(src)) {
            return typeName;
        }
    }
    return null;
}

/**
 * Detects non-basic types.
 * 
 * @param lineText The line of code to detect a type for.
 * @param documentText The source code of the text document.
 * @returns The type or null if not found.
 */
export function detectNonBasicType(lineText: string, documentText: string): string | null {
    let regExp = new RegExp("= *(" + anyTypeName + ")\\(?");
    const match = regExp.exec(lineText);

    if (!match) {
        return null;
    }

    if (match[0].endsWith("(")) {
        
        if (classWithSameName(match[1], documentText)) {
            return match[1];
        }

        if (isProbablyAClass(match[1])) {
            regExp = new RegExp(`^[ \t]*def ${match[1]}\\(`, "m" );
            if (!regExp.test(documentText)) {
                return match[1];
            }
        } else {
            // Find the function definition and check if the return type is hinted
            regExp = new RegExp(`^[ \t]*def ${match[1]}\\([^)]*\\) *-> *(${anyTypeName})`, "m");

            const hintedCallMatch = regExp.exec(documentText);

            if (hintedCallMatch) {
                if (hintedCallMatch.length === 2 && isType(hintedCallMatch[1])) {
                    return hintedCallMatch[1];
                }
            }
        }
        return null;
    }
    if (importFound(match[1], documentText.substr(match.index - match.length))) {
        // Searching the import source document is not supported (yet?)
        return null;
    }

    regExp = new RegExp(`^[ \t]*${match[1]} *=.*`, "m");
    let varInitializationMatch = regExp.exec(documentText);
    if (varInitializationMatch) {
        return detectBasicType(varInitializationMatch[0]);
    }
    
    return null;
}

/**
 * Tests if a detected type is initialized using a terinary operator that
 *  might return more than a single type.
 * 
 * @param typeName The name of the detected type.
 * @param lineSrc The source code of the line.
 */
export function invalidTernaryOperator(typeName: string, lineSrc: string) {

    const regExp = new RegExp(" if +[^ ]+ +else( +[^ ]+) *$", "m");

    let ternaryMatch = regExp.exec(lineSrc);
    while (ternaryMatch) {
        const elseVar = ternaryMatch[1].trim();
        let elseTypeName = detectBasicType(elseVar, false);
        
        if (elseTypeName) {
            ternaryMatch = regExp.exec(elseTypeName);
            if (!ternaryMatch) {
                return typeName !== elseTypeName;
            }
        } else {
            return false;
        }
    }
    return false;
}

/**
 * Searches for a class with the same name as object and returns the name if found.
 * @param object The object.
 * @param documentText The text to search
 */
export function classWithSameName(object: string, documentText: string): string | null {
    const clsMatch = new RegExp(`^ *class +(${object})`, "mi").exec(documentText);
    return clsMatch ? clsMatch[1] : null;
}

function importFound(object: string, documentText: string): boolean {
    return new RegExp(
        `^[ \t]*(import +${object}|from +[a-zA-Z_][a-zA-Z0-9_-]* +import +${object}|import +${anyTypeName} +as +${object})`,
        "m"
    ).test(documentText);
}

function isProbablyAClass(lineText: string): boolean {
    return new RegExp(`^([a-zA-Z0-9_]+\\.)*[A-Z]`, "m").test(lineText);
}

function isType(text: string): boolean {
    return Object.values(Types).includes(text as Types);
}

const typeSearchOrder = [
    Types.List, 
    Types.Bool,
    Types.Complex,
    Types.Float,
    Types.String,   
    Types.Tuple,
    Types.Set,
    Types.Dict,
    Types.Int,
    Types.Object
];

/**
 * Get a new RegExp for finding basic types and {@class object}.
 * 
 * @param typeName the type name
 * @param prefix a prefix added to the RegExp pattern
 */
function typeSearchRegExp(typeName: string, prefix: string): RegExp {
    switch (typeName) {
        case Types.List:
            return new RegExp(`${prefix}(\\[|list\\()`, "m");
        case Types.Bool:
            return new RegExp(`${prefix}(True|False|bool\\()`, "m");
        case Types.Complex:
            return new RegExp(`${prefix}(\\(complex\\(|[[0-9+*\\/ -.]*[0-9][jJ])`, "m");
        case Types.Float:
            return new RegExp(`${prefix}(-*[0-9+*\/ -]*\\.[0-9]|float\\()`, "m");
        case Types.Tuple:
            return new RegExp(`${prefix}(\\(|tuple\\()`, "m"); 
        case Types.String:
            return new RegExp(`${prefix}(['\"]{3}|(\\( *)?\"[^\"]*\"(?! *,)|(\\( *)?'[^']*'(?! *,)|str\\()`, "m");
        case Types.Set:
            return new RegExp(`${prefix}({[^:]+[,}]|set\\()`, "m");
        case Types.Dict:
            return new RegExp(`${prefix}({|dict\\()`, "m");
        case Types.Int:
            return new RegExp(`${prefix}(-*[0-9]|int\\()`, "m");
        case Types.Object:
            return new RegExp(`${prefix}object\\(`, "m");        
        default:
            return new RegExp(`^.*$`, "m");
    }
}
