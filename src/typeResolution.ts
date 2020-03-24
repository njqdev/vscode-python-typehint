import { TextDocument } from "vscode";
import * as search from "./codeSearch";

export class TypeResolver {
    
    /**
     * Finds the type of a parameter.
     * @param doc The document to search.
     * @param param The parameter name.
     */
    public FindTypeInDocument(doc: TextDocument, param: string): string | null {
        const documentText = doc.getText();
        let type: string | null = "";
        let m = new RegExp("^[ \t]*" + param + " *=", "m").exec(documentText);
        if (m && m[0]) {
            let line = doc.lineAt(doc.positionAt(m.index + m[0].length - 1));

            type = search.detectBasicType(line.text);

            if (type === null) {
                type = search.detectNotBasicType(line.text, documentText);
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