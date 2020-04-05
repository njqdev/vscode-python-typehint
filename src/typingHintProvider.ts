import { TextDocument } from "vscode";
import { DataType, TypeCategory } from "./python";
import { capitalized } from "./utils";
import { TypeHint } from "./typeHintProvider";

/**
 * Provides type hints for the Python typing module.
 */
export class TypingHintProvider {

    //private doc: TextDocument;
    private docText: string;
    private importStatement: string | null = null;
    private typingPrefix: string = "typing";
    private fromTypingImport: boolean = false;

    private typingImports: string[] = [];

    /**
     * Constructs a new TypeResolver.
     * @param docText The document text to search.
     */
    constructor(docText: string) {
        this.docText = docText;
    }


    public async containsTyping() {
        let m = new RegExp(
            `^[ \t]*from typing import +([a-zA-Z_][a-zA-Z0-9_-]+)`,
            "m"
        ).exec(this.docText);
        
        if (m) {
            this.importStatement = m[0];
            this.fromTypingImport = true;
            const typings = m[1].split(",");
            typings.forEach(t => {
                this.typingImports.push(t.trim());
            });
            return true;
        } else {
            m = new RegExp(
                `^[ \t]*(import +typing +as +([a-zA-Z_][a-zA-Z0-9_-]+)|import +typing)`,
                "m"
            ).exec(this.docText);
            if (m) {
                this.importStatement = m[0];
                if (m[2]) {
                    this.typingPrefix = m[3];
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Get a hint for the type if typing is imported.
     * @param type The type.
     * @returns A type hint string.
     */
    public getTypingHint(type: DataType): TypeHint | null {
        const typingName = capitalized(type.name);

        if (type.category === TypeCategory.Collection && this.importStatement) {

            if (this.fromTypingImport && this.typingImports.includes(typingName)) {
                return { type: typingName, insertText: ` ${typingName}[` };
            }
            return { type: `${this.typingPrefix}.${typingName}`, insertText: ` ${this.typingPrefix}.${typingName}[` };
        }
        return null;
    }

}