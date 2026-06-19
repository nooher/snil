// ast.ts — the syntax-tree contract of SNIL. The parser produces these nodes; the
// interpreter and the Python code generator BOTH consume them. This file is the
// single source of truth that every component (built in parallel) targets.
//
// Every node carries `line` (1-based) so errors can point at Kiswahili locations.

export interface Node { line: number; }

// ───────────────────────── Expressions ─────────────────────────
export interface NumberLit extends Node { kind: 'NumberLit'; value: number; }
export interface StringLit extends Node { kind: 'StringLit'; value: string; }
export interface BoolLit extends Node { kind: 'BoolLit'; value: boolean; }   // kweli / si_kweli
export interface NullLit extends Node { kind: 'NullLit'; }                    // tupu
export interface ListLit extends Node { kind: 'ListLit'; items: Expr[]; }     // ["a", "b"]
export interface DictLit extends Node { kind: 'DictLit'; entries: { key: string; value: Expr }[]; } // { jina: "Ali" }
export interface Ident extends Node { kind: 'Ident'; name: string; }

/** Binary op. op ∈ + - * / %  ==  !=  <  >  <=  >=  na  au  */
export interface Binary extends Node { kind: 'Binary'; op: BinOp; left: Expr; right: Expr; }
export type BinOp = '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '>' | '<=' | '>=' | 'na' | 'au';

/** Unary op. op ∈ -  sio  */
export interface Unary extends Node { kind: 'Unary'; op: '-' | 'sio'; operand: Expr; }

/** Function call: salamu("Asha") — also builtins like idadi(x). */
export interface Call extends Node { kind: 'Call'; callee: string; args: Expr[]; }

/** List/dict index: orodha[0]  (bracket access). */
export interface Index extends Node { kind: 'Index'; target: Expr; index: Expr; }

/** Member access: mtu.jina  (dot access on a Kamusi). */
export interface Member extends Node { kind: 'Member'; target: Expr; name: string; }

export type Expr =
  | NumberLit | StringLit | BoolLit | NullLit | ListLit | DictLit
  | Ident | Binary | Unary | Call | Index | Member;

// ───────────────────────── Statements ─────────────────────────
export interface VarDecl extends Node { kind: 'VarDecl'; name: string; value: Expr; }        // weka X kuwa <e>
export interface Assign extends Node { kind: 'Assign'; target: Ident | Index | Member; value: Expr; } // X = <e> | a[i]=<e> | m.k=<e>
export interface Print extends Node { kind: 'Print'; value: Expr; }                           // onyesha <e>
export interface Input extends Node { kind: 'Input'; prompt: Expr; name: string; }            // uliza "?" kuwa X
export interface If extends Node { kind: 'If'; cond: Expr; then: Stmt[]; otherwise: Stmt[] | null; } // ikiwa..basi..vinginevyo..mwisho
export interface ForEach extends Node { kind: 'ForEach'; varName: string; iterable: Expr; body: Stmt[]; } // kwa kila X katika L
export interface ForRange extends Node { kind: 'ForRange'; varName: string; from: Expr; to: Expr; body: Stmt[]; } // kwa kila X kutoka A hadi B (inclusive)
export interface While extends Node { kind: 'While'; cond: Expr; body: Stmt[]; }              // wakati <c> .. mwisho
export interface FuncDecl extends Node { kind: 'FuncDecl'; name: string; params: string[]; body: Stmt[]; } // kazi f(a,b)..mwisho
export interface Return extends Node { kind: 'Return'; value: Expr | null; }                  // rudisha <e>
export interface Try extends Node { kind: 'Try'; body: Stmt[]; handler: Stmt[]; }             // jaribu..kosa..mwisho
export interface Import extends Node { kind: 'Import'; module: string; }                      // leta hisabati
export interface ListAdd extends Node { kind: 'ListAdd'; item: Expr; list: Expr; }            // ongeza X kwenye L
export interface ListRemove extends Node { kind: 'ListRemove'; item: Expr; list: Expr; }      // ondoa X kutoka L
export interface FileWrite extends Node { kind: 'FileWrite'; data: Expr; path: Expr; }        // andika data kwenye "f"
export interface FileRead extends Node { kind: 'FileRead'; path: Expr; name: string; }        // soma "f" kuwa X
export interface ExprStmt extends Node { kind: 'ExprStmt'; expr: Expr; }                      // bare call, e.g. onyesha salamu(..) is Print; salamu(..) alone is ExprStmt

export type Stmt =
  | VarDecl | Assign | Print | Input | If | ForEach | ForRange | While
  | FuncDecl | Return | Try | Import | ListAdd | ListRemove | FileWrite | FileRead | ExprStmt;

export interface Program { kind: 'Program'; body: Stmt[]; }
