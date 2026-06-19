# SNIL — Kiswahili (VS Code Extension)

Syntax highlighting and editor support for **SNIL**, the sovereign Kiswahili
programming language. Open any `.snil` file and get colorized keywords, strings,
numbers, comments, operators, standard-library function names, and function
calls — plus smart bracket/quote auto-closing and Kiswahili-aware block
indentation (`basi` / `kazi` / `wakati` / `kwa kila … hadi` / `jaribu` indent;
`mwisho` / `vinginevyo` / `kosa` dedent).

This extension is **pure declarative** — no build step, no dependencies. It
contributes a TextMate grammar (`source.snil`) and a language configuration.

## What gets highlighted

| Scope | Tokens |
| --- | --- |
| `keyword.control.snil` | `ikiwa basi vinginevyo mwisho kwa kila katika kutoka hadi wakati rudisha jaribu kosa` |
| `keyword.other.snil` | `weka kuwa kazi leta onyesha uliza soma andika ongeza ondoa kwenye` |
| `keyword.operator.snil` | `na au sio` and `= == != < > <= >= + - * / %` |
| `constant.language.snil` | `kweli si_kweli tupu` |
| `support.function.snil` | builtins + stdlib: `idadi namba maandishi mzunguko kamili jumla wastani kiwango_cha_juu kiwango_cha_chini mzizi kipeo herufi_kubwa herufi_ndogo unganisha gawanya ina badilisha ondoa_nafasi panga geuza sasa leo mwaka mwezi siku` |
| `string.quoted.double.snil` | `"…"` with `\n \t \" \\` escapes |
| `constant.numeric.snil` | integers and decimals |
| `comment.line` / `comment.block` | `# …` and `### … ###` |
| `entity.name.function.snil` | `name(` call sites |

Keyword spellings are kept in lockstep with `src/lang/tokens.ts` (`KEYWORDS`) and
the standard library in `src/lang/stdlib.ts`.

## Install

### Method A — package and install a `.vsix` (recommended)

```sh
cd vscode-snil
npx @vscode/vsce package
code --install-extension snil-0.1.0.vsix
```

Then reload VS Code. Open any `.snil` file (or set the language mode to **SNIL**).

### Method B — drop into the extensions folder

Copy this whole `vscode-snil/` folder to your user extensions directory and
reload:

- **Windows:** `%USERPROFILE%\.vscode\extensions\snil-0.1.0`
- **macOS / Linux:** `~/.vscode/extensions/snil-0.1.0`

```sh
# from the repo root, e.g. on Windows PowerShell:
Copy-Item -Recurse vscode-snil "$env:USERPROFILE\.vscode\extensions\snil-0.1.0"
```

Reload the window (`Developer: Reload Window`) and open a `.snil` file.

---

Part of the **SNIL flagship by Laetoli**. SNIL ni lugha yake — yenye utambulisho wake.
