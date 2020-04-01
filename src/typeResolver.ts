import { TextDocument } from "vscode";
import * as search from "./codeSearch";
import { Types, DataTypes, getDataTypes } from "./python";


export interface TypeResolution {
    estimations: string[];
    remainingTypes: string[];
}

enum DetectionFrom {  // unnecessary?
    ClassWithSameName,
    VariableWithSameName,
    UnderscoreTypeInParam,
    Guess
}

export class TypeResolver {
    
    private likelyTypes: Types[] = [
        Types.String,
        Types.List, 
        Types.Dict, 
        Types.Bool, 
        Types.Int, 
        Types.Tuple, 
        Types.Float
    ];
    private dataTypes: DataTypes = getDataTypes();
    private includedTypeNames: { [key: string]: string } = {};

    /**
     * Estimates the type of a parameter.
     * 
     * @param param The parameter to resolve.
     * @param doc The document to search.
     */
    public ResolveTypes(param: string, doc: TextDocument): TypeResolution {
        const documentText = doc.getText();

        const resolution: TypeResolution = { estimations: [], remainingTypes: [] };

        const foundClassName = search.classWithSameName(param, documentText);
        this.addIfNotNull(foundClassName, resolution);

        if (this.addIfParamEndsWithTypeName(param, "_", resolution)) {
            return this.addRemainingTypes(resolution);
        }
        
        const variableMatch = new RegExp(`^[ \t]*${param} *=.`, "m").exec(documentText);

        if (variableMatch && variableMatch[0]) {
            const line = doc.lineAt(doc.positionAt(variableMatch.index + variableMatch[0].length));

            let typeName = search.detectBasicType(line.text);
            if (typeName === null) {
                typeName = search.detectNonBasicType(line.text, documentText);
            }
            if (typeName !== null) {
                if (!search.invalidTernaryOperator(typeName, line.text)) {
                    this.add(typeName, resolution);
                }
            }
        } else {
            this.addIfParamEndsWithTypeName(param, "", resolution);
        }

        this.addIfNotNull(this.GuessType(param), resolution);
        return this.addRemainingTypes(resolution);
    }

    /**
     * Returns true if a type estimation is added.
     */
    private addIfParamEndsWithTypeName(param: string, prefix: string, resolution: TypeResolution): boolean {
        const paramUpper = param.toUpperCase();

        for (const type of this.likelyTypes) {
            if (paramUpper.endsWith(`${prefix}${type.toUpperCase()}`)) {
                this.add(type, resolution);
                return true;
            }
        }
        return false;
    }

    private GuessType(param: string): string | null {
        if (param in this.TypeGuesses) {
            return this.TypeGuesses[param];
        }
        return null;
    }

    /**
     * Guesses used if a param with the same name is not found in the active document.
     */
    private TypeGuesses: { [key: string]: string } = {
        "string": Types.String,
        "text": Types.String,
        "path": Types.String,
        "url": Types.String,
        "uri": Types.String,
        "fullpath": Types.String,
        "full_path": Types.String,
        "number": Types.Int,
        "num": Types.Int
    };
    
    private add(typeName: string, resolution: TypeResolution) {
        if (this.typeNotIncluded(typeName)) {
            resolution.estimations.push(typeName);
            this.includedTypeNames[typeName] = typeName;
        }
    }

    private addIfNotNull(typeName: string | null, resolution: TypeResolution) {
        if (typeName) {
            this.add(typeName, resolution);
        }
    }

    private addRemainingTypes(resolution: TypeResolution): TypeResolution {
        for (const type of Object.values(this.dataTypes)) {
            if (this.typeNotIncluded(type.name)) {
                resolution.remainingTypes.push(type.name);
            }
        }
        return resolution;
    }

    private typeNotIncluded(typeName: string): boolean {
        return !(typeName in this.includedTypeNames);
    }
}