import { TextDocument } from "vscode";
import * as search from "./codeSearch";
import { Type, returnHintTrigger } from "./syntax";
import { ToTitleCase } from "./utils";

export class TypeResolver {
    
    private likelyTypes: Type[] = [ Type.String, Type.List, Type.Dict, Type.Bool, Type.Int, Type.Tuple, Type.Float ];

    /**
     * Estimates the type of a parameter,
     * by searching the document for an initialized variable with the same name.
     * 
     * @param doc The document to search.
     * @param param The parameter name.
     */
    public EstimateType(doc: TextDocument, param: string): string | null {
        const documentText = doc.getText();
        
        let type = this.GetTypeIfEndsWith(param, "_", ...this.likelyTypes);
        if (type) {
            return type;
        }
        
        const variableMatch = new RegExp(`^[ \t]*${param} *=.`, "m").exec(documentText);

        if (variableMatch && variableMatch[0]) {
            const valueStartPosition = doc.positionAt(variableMatch.index + variableMatch[0].length);
            const line = doc.lineAt(valueStartPosition);

            let typeName = search.detectBasicType(line.text);

            if (typeName === null) {
                typeName = search.detectNonBasicType(line.text, documentText);
            }

            if (typeName !== null) {
                if (!search.invalidTernaryOperator(typeName, line.text)) {
                    return typeName;
                }
            }
        }
        type = this.GuessType(param);
        return type ? type : this.GetTypeIfEndsWith(param, "", Type.List, Type.Dict);
    }

    private GetTypeIfEndsWith(param: string, prefix: string, ...typesToCheckFor: Type[]): Type | null {

        for (const type of typesToCheckFor) {
            if (param.endsWith(`${prefix}${type}`)) {
                return type;
            }
        }
        return null;
    }

    private GuessType(param: string): Type | null {
        if (param in this.TypeGuesses) {
            return this.TypeGuesses[param];
        }
        return null;
    }

    /**
     * Guesses used if a param with the same name is not found in the active document.
     */
    private TypeGuesses: { [key: string]: Type } = {
        "string": Type.String,
        "text": Type.String,
        "path": Type.String,
        "url": Type.String,
        "uri": Type.String,
        "fullpath": Type.String,
        "full_path": Type.String,
        "number": Type.Int,
        "num": Type.Int
    };
}