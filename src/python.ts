
export const anyClassOrFunctionName: string = "[a-zA-Z_][a-zA-Z0-9_.]*";

export const paramHintTrigger: string = ":";
export const returnHintTrigger: string = ">";

export class DataType {
    name: PythonType;
    category: TypeCategory;

    constructor(name: PythonType, category: TypeCategory) {
        this.name = name;
        this.category = category;
    }
}

export interface DataTypeContainer {
     [key: string]: DataType 
};

export const getDataTypeContainer = (): DataTypeContainer => {
    return {
        bool: new DataType(PythonType.Bool, typeCategories.bool),
        complex: new DataType(PythonType.Complex, typeCategories.complex),
        dict: new DataType(PythonType.Dict, typeCategories.dict),
        float: new DataType(PythonType.Float, typeCategories.float),
        int: new DataType(PythonType.Int, typeCategories.int),
        list: new DataType(PythonType.List, typeCategories.list),
        object: new DataType(PythonType.Object, typeCategories.object),
        set: new DataType(PythonType.Set, typeCategories.set),
        str: new DataType(PythonType.String, typeCategories.string),
        tuple: new DataType(PythonType.Tuple, typeCategories.tuple)
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
 * Built-in Python types.
 */
export enum PythonType {
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
 * Built-in Python type keys with Type category values. 
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
