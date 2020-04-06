# vscode-python-autohint README

Provides type hint auto-completion for Python.

![](demo.gif)

## Features

* Estimates the correct type to provide as a completion item.

* Searches Python files in the workspace for type estimation purposes.

## Installation

Get this extension from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=).

## Known Issues

* The difference between classes and function calls when detecting types is determined by the first letter being upper case (unless the class or function is defined in the currently edited document).

-------------------------------------------------------------------------------------------
