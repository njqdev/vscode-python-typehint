import { TextDocument } from "vscode";
import { TypeName as TypeName, DataTypes, getDataTypes } from "./python";
import { CodeSearch } from "./codeSearch";
import { TypingHintProvider } from "./typingHintProvider";

/**
 * A type hint to build a {@link CompletionItem} with.
 */
export interface TypeHint {
    type: string;
    insertText?: string;
}

/**
 * Provides type hints.
 */
export class TypeHintProvider {
    
    private likelyTypes: TypeName[] = [
        TypeName.String,
        TypeName.List, 
        TypeName.Dict, 
        TypeName.Bool, 
        TypeName.Int, 
        TypeName.Tuple, 
        TypeName.Float
    ];
    private dataTypes: DataTypes = getDataTypes();
    private includedTypes: { [key: string]: string } = {};
    private doc: TextDocument;

    /**
     * Constructs a new TypeHintProvider.
     * 
     * @param doc The active document.
     */
    constructor(doc: TextDocument) {
        this.doc = doc;
    }

    /**
     * Provides type hints for a parameter.
     * 
     * @param param The parameter name.
     * @returns An array of type hints, ordered by estimation accuracy.
     */
    public async getTypeHints(param: string): Promise<TypeHint[]> {
        const documentText = this.doc.getText();
        const typeHints: TypeHint[] = [];
        const typingHintProvider = new TypingHintProvider(documentText);
        const typingImported = typingHintProvider.containsTyping();

        let typeName = CodeSearch.classWithSameName(param, documentText);
        this.addIfNotNull(typeName, typeHints);

        typeName = this.getTypeInParam(param, "_");
        if (typeName) {
            this.tryAddTypingHint(await typingImported, typeName, typingHintProvider, typeHints);
            return typeHints;
        }

        const varWithSameName = new RegExp(`^[ \t]*${param} *=.`, "m").exec(documentText);

        if (varWithSameName) {
            const line = this.doc.lineAt(this.doc.positionAt(varWithSameName.index + varWithSameName[0].length));
            const searchResult = await CodeSearch.detectType(line.text, documentText);

            if (searchResult !== null && !await CodeSearch.invalidTernaryOperator(line.text, searchResult)) {
                this.add(searchResult.typeName, typeHints);
                this.tryAddTypingHint(await typingImported, searchResult.typeName, typingHintProvider, typeHints);
            }
        } else {
            this.getTypeInParam(param, "");
        }

        typeName = this.typeGuessFor(param, typeHints);
        this.addIfNotNull(typeName, typeHints);
        return typeHints;
    }
    
    /**
     * Gets names of types that have not been provided.
     * 
     * @returns An array of type names.
     */
    public getRemainingTypes(): TypeName[] {
        const result: TypeName[] = [];

        for (const type of Object.values(this.dataTypes)) {
            if (this.typeNotIncluded(type.name)) {
                result.push(type.name);
            }
        }
        return result;
    }

    /**
     * Get insertText for a type hint.
     * 
     * @param typeName The type name to format as insertText.
     */
    public static insertTextFor(typeName: string) {
        return " " + typeName;
    }

    /**
     * If the param ends with a type name, the type is returned.
     * @param param The parameter name.
     * @param prefix A prefix before the typename. For example, a param named x{prefix}list will return 'list'.
     */
    private getTypeInParam(param: string, prefix: string): TypeName | null {
        const paramUpper = param.toUpperCase();

        for (const type of this.likelyTypes) {
            if (paramUpper.endsWith(`${prefix}${type.toUpperCase()}`)) {
                return type;
            }
        }
        return null;
    }

    private typeGuessFor(param: string, typeHints: TypeHint[]): string | null {
        const typeGuesses: { [key: string]: string } = {
            "string": TypeName.String,
            "text": TypeName.String,
            "path": TypeName.String,
            "url": TypeName.String,
            "uri": TypeName.String,
            "fullpath": TypeName.String,
            "full_path": TypeName.String,
            "number": TypeName.Int,
            "num": TypeName.Int
        };
        if (param in typeGuesses) {
            this.add(typeGuesses[param], typeHints);
            return typeGuesses[param];
        }
        return null;
    }
    
    private tryAddTypingHint(
        typingImported: boolean,
        typeName: string,
        typingHintProvider: TypingHintProvider,
        typeHints: TypeHint[]
    ): boolean {
        if (typingImported && typeName in this.dataTypes) {
            this.addTypeHintIfNotNull(typingHintProvider.getTypingHint(this.dataTypes[typeName]), typeHints);
            return true;
        }
        return false;
    }

    private typeNotIncluded(type: string): boolean {
        return !(type in this.includedTypes);
    }

    private add(type: string, typeHints: TypeHint[]) {
        if (this.typeNotIncluded(type)) {
            typeHints.push({ type, insertText: TypeHintProvider.insertTextFor(type) });
            this.includedTypes[type] = type;
        }
    }
    
    private addTypeHintIfNotNull(hint: TypeHint | null, typeHints: TypeHint[]) {
        if (hint && this.typeNotIncluded(hint.type)) {
            typeHints.push(hint);
            this.includedTypes[hint.type] = hint.type;
        }
    }

    private addIfNotNull(type: string | null, typeHints: TypeHint[]) {
        if (type) {
            this.add(type, typeHints);
        }
    }
}