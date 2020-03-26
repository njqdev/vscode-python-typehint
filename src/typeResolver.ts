import { TextDocument } from "vscode";
import * as search from "./codeSearch";

export class TypeResolver {
    
    /**
     * Estimates the type of a parameter.
     * @param doc The document to search.
     * @param param The parameter name.
     */
    public EstimateType(doc: TextDocument, param: string): string | null {
        const documentText = doc.getText();
        let type: string | null = "";
        const match = new RegExp(`^[ \t]*${param} *=.`, "m").exec(documentText);

        if (match && match[0]) {
            const valueStartPosition = doc.positionAt(match.index + match[0].length);
            const line = doc.lineAt(valueStartPosition);

            type = search.detectBasicType(line.text);

            if (type === null) {
                type = search.detectNonBasicType(line.text, documentText);
            }

            if (type !== null) {
                if (!search.invalidTernaryOperator(type, line.text)) {
                    return type;
                }
            }
        }
        return null;
    }
}