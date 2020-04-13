# Python Type Hint

Provides type hint auto-completion for Python, with completion items for built-in types, classes and the typing module.


![](images/demo.gif)

## Features

* Estimates the correct type to provide as a completion item.

* Searches Python files in the workspace for type estimation purposes.

* Can provide completion items for the typing module if it is imported.

## Settings

| Name | Description | Default
|---|---|---|
| workspace.search.limit | _(number)_ The maximum number of files searched when estimating types for a parameter. If 0, only the current editor document is searched, which increases speed but can reduce estimation accuracy. | 20

## Installation

The extension can found on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=njqdev.vscode-python-typehint).

## Known Issues

* The difference between function and class constructor calls when detecting types is determined by the first letter being upper case (unless the class or function is defined in the currently edited document).

-------------------------------------------------------------------------------------------
