
export const anyTypeName: string = "[a-zA-Z_][a-zA-Z0-9_.]*";

export const paramHintTrigger: string = ":";
export const returnHintTrigger: string = ">";

export class DataType {
    name: TypeName;
    category: TypeCategory;

    constructor(name: TypeName, category: TypeCategory) {
        this.name = name;
        this.category = category;
    }
}

export interface DataTypes {
     [key: string]: DataType 
};

export const getDataTypes = (): DataTypes => {
    return {
        bool: new DataType(TypeName.Bool, typeCategories.bool),
        complex: new DataType(TypeName.Complex, typeCategories.complex),
        dict: new DataType(TypeName.Dict, typeCategories.dict),
        float: new DataType(TypeName.Float, typeCategories.float),
        int: new DataType(TypeName.Int, typeCategories.int),
        list: new DataType(TypeName.List, typeCategories.list),
        object: new DataType(TypeName.Object, typeCategories.object),
        set: new DataType(TypeName.Set, typeCategories.set),
        str: new DataType(TypeName.String, typeCategories.string),
        tuple: new DataType(TypeName.Tuple, typeCategories.tuple)
    };
};

/**
 * Ways a variable can be initialized.
 */
export enum Initialization {
    WithValue,
    WithCall
}

/**
 * Names of built-in Python types which can be hinted. 
 */
export enum TypeName {
    Bool = "bool",
    Complex = "complex",
    Dict = "dict",
    Float = "float",
    Int = "int",
    List = "list",
    Object = "object",
    Set = "set",
    String = "str",
    Tuple = "tuple",
}

/**
 * Categories of Python types.
 */
export enum TypeCategory {
    Abstract,
    Basic,
    Collection
}

/**
 * Type name keys with Type values. 
 */
const typeCategories: { [key: string]: TypeCategory } = {
    bool: TypeCategory.Basic,
    complex: TypeCategory.Basic,
    dict: TypeCategory.Collection,
    float: TypeCategory.Basic,
    int: TypeCategory.Basic,
    list: TypeCategory.Collection,
    object: TypeCategory.Abstract,
    set: TypeCategory.Collection,
    string: TypeCategory.Basic,
    tuple: TypeCategory.Collection
};
