import {
    TextLine, 
    Position
 } from "vscode";

import { anyTypeName, Type } from "./syntax";

/**
 * Finds the param which is about to be type hinted.
 * 
 * @param line The active line.
 * @param pos The active position.
 */
export function findParam(line: TextLine, pos: Position): string | null {
    let param = null;
    let split = line.text.substr(0, pos.character).split(new RegExp("[,(]"));
    if (split.length > 1) {
        param = split[split.length - 1].trim();
        param = param.substr(0, param.length - 1);
    }
    return param;
}

/**
 * Detects the type of an initialized variable.
 * 
 * @param src The line of code or value to detect a type for.
 * @param srcIsLineOfCode Determine the type from a line of code.
 * @returns The type or null if not found.
 */
export function detectBasicType(src: string, srcIsLineOfCode = true): string | null {

    for (const typeName of Object.values(Type)) {
        let r = getTypeRegEx(typeName, srcIsLineOfCode ? "= *" : "");
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
export function detectNotBasicType(lineText: string, documentText: string): string | null {
    let regExp = new RegExp("= *(" + anyTypeName + ")\\(?");
    const match = regExp.exec(lineText);

    if (!match) {
        return null;
    }

    if (match[0].endsWith("(")) {
        
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
    if ( 
        isImported(
            match[1],
            documentText.substr(match.index - match.length)
        )
    ) {
        // Searching the import source document is not supported (yet?)
        return null;
    }

    regExp = new RegExp(`^[ \t]*${match[1]} *=.*`, "m");
    let objInitializationMatch = regExp.exec(documentText);
    if (objInitializationMatch) {
        return detectBasicType(objInitializationMatch[0]);
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

    const regExp = new RegExp(
        " if +[^ ]+ +else( +[^ ]+) *$", 
        "m"
    );

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

function isImported(text: string, documentText: string): boolean {
    return new RegExp(
        `^ *(import +${text}|from +[a-zA-Z_][a-zA-Z0-9_-]* +import +${text}`
        + `|import +${anyTypeName} +as +${text})`,
        "m"
    ).test(documentText);
}

function isProbablyAClass(text: string): boolean {
    return new RegExp(`^([a-zA-Z0-9_]+\\.)*[A-Z]`, "m").test(text);
}

function isType(text: string): boolean {
    return Object.values(Type).includes(text as Type);
}

/**
 * Get a new RegExp for finding basic types and {@class object}.
 * 
 * @param typeName the type name
 * @param prefix a prefix added to the RegExp pattern
 */
function getTypeRegEx(typeName: string, prefix: string): RegExp {
    switch (typeName) {
        case Type.Bool:
            return new RegExp(`${prefix}(True|False|bool\\()`, "m");
        case Type.Dict:
            return new RegExp(`${prefix}({|dict\\()`, "m");
        case Type.Int:
            return new RegExp(`${prefix}(-*[0-9]+(?!(\\.| *\\)| *,))|int\\()`, "m");
        case Type.List:
            return new RegExp(`${prefix}(\\[|list\\()`, "m");
        case Type.String:
            return new RegExp(`${prefix}(['\"]{3}|(\\( *)?\"[^\"]*\"(?! *,)|(\\( *)?'[^']*'(?! *,)|str\\()`, "m");
        case Type.Float:
            return new RegExp(`${prefix}(-*[0-9]*\\.[0-9]+|float\\()`, "m");
        case Type.Tuple:
            return new RegExp(`${prefix}(\\(([^'\",)]+,|\"[^\"]*\"(?= *,)|'[^']*'(?= *,))|tuple\\()`, "m"); 
        case Type.Complex:
            return new RegExp(`${prefix}(\\(complex\\(|[0-9][0-9+-/*.]*[jJ])`, "m");        
        default:
            return new RegExp(`${prefix}object\\(`, "m");
    }
}

