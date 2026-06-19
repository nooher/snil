# SNIL — Sarufi Rasmi (Grammar v1.0)

SNIL ni lugha yake yenye utambulisho wake. Hii ndiyo sarufi rasmi inayofuatwa na
lexer, parser, interpreter, na Python codegen. (EBNF isiyo rasmi; `mwisho` hufunga
kila block.)

## Lexical
- **Namba**: `10`, `3.14` (integer or decimal). No leading-`+`.
- **Maandishi**: `"..."` double-quoted; supports `\n`, `\t`, `\"`, `\\`.
- **Uingizaji wa misemo (string interpolation)**: inside a double-quoted string,
  `{ EXPR }` embeds any SNIL expression, stringified with SNIL display rules (the
  SAME stringify used by `+` concatenation / `_str`). Example:
  `weka jina kuwa "Asha"` ; `onyesha "Habari {jina}!"` → `Habari Asha!`. The
  expression may be complex: `"Jumla: {a + b}"`, `"{mtu.jina} ana miaka {mtu.umri}"`,
  `"{herufi_kubwa(jina)}"`. The expression must stay on one line.
  - A **literal brace** is written `\{` / `\}`. A `}` that is not closing an
    interpolation is a literal `}`. Inside `{ … }`, braces nest by depth and `"…"`
    string literals are scanned over, so braces inside a nested string don't end it.
  - **Empty interpolation** `{}` (or only whitespace) is a **lexical error** in
    Kiswahili (write `\{` for a literal brace, or put an expression inside).
  - A plain string with no `{` is unchanged (a single `StringLit`; zero regression).
- **Kweli/Uongo**: `kweli`, `si_kweli`. **Tupu**: `tupu`.
- **Vitambulishi (identifiers)**: start with a letter (a–z, A–Z), then letters/digits/`_`. Not a reserved keyword.
- **Maoni (comments)**: `# ...` to end of line; `### ... ###` multi-line. Ignored.
- **Newlines** separate statements (no semicolons). Blank lines ignored.
- Reserved keywords: see `tokens.ts` KEYWORDS.

## Operators & precedence (low → high)
1. `au` (or)
2. `na` (and)
3. `==` `!=` `<` `>` `<=` `>=`
4. `+` `-`
5. `*` `/` `%`
6. unary `sio` (not), unary `-`
7. call `f(...)`, index `x[...]`, member `x.k`
8. grouping `( ... )`

## Statements
```
program     = { statement }
statement   = varDecl | assign | print | input | if | forEach | forRange
            | while | funcDecl | return | try | import | listAdd | listRemove
            | fileWrite | fileRead | exprStmt
varDecl     = "weka" IDENT "kuwa" expr
assign      = lvalue "=" expr                 # lvalue = IDENT | index | member
print       = "onyesha" expr
input       = "uliza" expr "kuwa" IDENT
if          = "ikiwa" expr "basi" { statement } [ "vinginevyo" { statement } ] "mwisho"
forEach     = "kwa" "kila" IDENT "katika" expr { statement } "mwisho"
forRange    = "kwa" "kila" IDENT "kutoka" expr "hadi" expr { statement } "mwisho"   # inclusive
while       = "wakati" expr { statement } "mwisho"
funcDecl    = "kazi" IDENT "(" [ IDENT { "," IDENT } ] ")" { statement } "mwisho"
return      = "rudisha" [ expr ]
try         = "jaribu" { statement } "kosa" { statement } "mwisho"
import      = "leta" IDENT
listAdd     = "ongeza" expr "kwenye" expr
listRemove  = "ondoa" expr "kutoka" expr
fileWrite   = "andika" expr "kwenye" expr
fileRead    = "soma" expr "kuwa" IDENT
exprStmt    = expr                            # usually a call
```

## Semantics (lazima zifuatwe na interpreter NA codegen)
- **`+`**: if EITHER operand is Maandishi → string concatenation (the other operand is
  stringified). Otherwise numeric addition. (So `"Jumla " + 15` → `"Jumla 15"`.)
- **String interpolation** `"…{e}…"`: each `{ e }` is evaluated and stringified by the
  SAME display rule as `+` / `onyesha` (`_str`), then concatenated with the literal
  parts. Identical output across interpreter, Python codegen, and JS codegen.
- Number→string: integers print without `.0` (`15`, not `15.0`); decimals as-is.
- **Booleans** print as `kweli` / `si_kweli`. **tupu** prints as `tupu`.
- **Lists** print as `[a, b, c]`; **dicts** as `{jina: Ali, umri: 20}` (display form).
- `idadi(x)` = length of list or string. `ongeza`/`ondoa` mutate the list in place.
- `kwa kila n kutoka 1 hadi 3` iterates n = 1,2,3 (**inclusive** both ends).
- Division `/` is real division; `%` modulo. Divide-by-zero → Kiswahili runtime error.
- Truthiness in `ikiwa`/`wakati`: `si_kweli`, `tupu`, `0`, `""`, empty list = false; else true.
- Unknown variable/function, type errors, etc. → `SnilError` in Kiswahili with line number.

## Maktaba ya kawaida (Standard library)
Kazi za moduli zinapatikana baada ya `leta MODULI` na huitwa kwa **jina bayana** (mfano,
baada ya `leta hisabati` unaita `jumla(orodha)` moja kwa moja, si `hisabati.jumla`).
Tabia na maonyesho ni **sawasawa** kwa interpreter na codegen ya Python.

**Kazi za kila mahali (BUILTINS — hazihitaji `leta`):**
- `idadi(x)` — urefu wa orodha au maandishi.
- `namba(x)` — geuza kuwa namba (maandishi/namba → namba; kosa la Kiswahili ikiwa
  maandishi si namba halali, mfano `namba("abc")`).
- `maandishi(x)` — mfuatano wa kuonyesha wa SNIL wa `x` (kamili bila `.0`, orodha/kamusi
  katika muundo wa SNIL, `kweli`/`si_kweli`/`tupu`).
- `mzunguko(x)` — zungusha hadi nambari kamili iliyo karibu (nusu → juu, mfano `2.5`→`3`).
- `kamili(x)` — thamani kamili / chanya (absolute value).

**Moduli `hisabati`** (`leta hisabati`):
- `jumla(orodha)` — jumla. `wastani(orodha)` — wastani. `kiwango_cha_juu` / `kiwango_cha_chini`
  — kubwa / ndogo. `mzizi(x)` — mzizi wa pili. `kipeo(msingi, kipeo)` — msingi kwa kipeo (power).
- `kipeo_cha_pili(x)` — x mraba (x × x).
- `salio(a, b)` — baki ya mgawanyo (a mod b; ishara hufuata `a`, kama `%`). Kosa ikiwa `b` ni sifuri.
- `mviringo(x, dp)` — zungusha hadi sehemu `dp` za desimali (nusu → mbali na sifuri). `dp` lazima
  iwe namba kamili isiyo hasi.

**Moduli `maandishi`** (`leta maandishi`):
- `herufi_kubwa(s)` / `herufi_ndogo(s)` — herufi kubwa / ndogo. `unganisha(orodha, kitenganishi)`
  — unganisha. `gawanya(maandishi, kitenganishi)` — gawanya.
- `ina(maneno, sehemu)` — je, maneno yana sehemu? (kweli/si_kweli).
- `badilisha(maneno, ya_zamani, mpya)` — badilisha matukio yote.
- `ondoa_nafasi(maneno)` — ondoa nafasi za mwanzo na mwisho (trim).
- `anza_na(s, x)` — je, `s` inaanza na `x`? `isha_na(s, x)` — je, `s` inaishia na `x`? (kweli/si_kweli).
- `pata(s, x)` — fahirisi ya kwanza ya `x` ndani ya `s` (0-based, `-1` ikiwa haipo).
- `rudia(s, n)` — rudia `s` mara `n` (`n` kamili isiyo hasi; `0` → `""`).
- `kata(s, anza, mwisho)` — sehemu ya maandishi `[anza, mwisho)` (mipaka kamili; hasi → 0,
  kubwa kupita → urefu; `anza >= mwisho` → `""`).

**Moduli `orodha`** (`leta orodha`):
- `panga(orodha)` — **nakala** iliyopangwa kwa kupanda (namba kihisabati, maandishi
  kialfabeti; orodha lazima iwe ya aina moja — yote namba AU yote maandishi).
- `geuza(orodha)` — **nakala** iliyopinduliwa. `ina(orodha, kitu)` — je, orodha ina kitu?
  (ulinganifu wa thamani, wa kina kwa orodha/kamusi).
- `chukua(orodha, anza, mwisho)` — **nakala** ya sehemu `[anza, mwisho)` (mipaka kamili; hasi → 0,
  kubwa kupita → urefu; `anza >= mwisho` → `[]`).
- `fahirisi(orodha, kitu)` — fahirisi ya kwanza ya `kitu` (0-based, `-1` ikiwa haipo).
- `unganisha_mbili(a, b)` — orodha **MPYA** ya `a` ikifuatwa na `b` (haibadilishi za asili).
- `kichwa(orodha)` — kipengele cha kwanza (kosa ikiwa orodha ni tupu).
- `mkia(orodha)` — nakala **MPYA** bila kipengele cha kwanza (kosa ikiwa orodha ni tupu).
- `panga`/`geuza`/`chukua`/`mkia`/`unganisha_mbili` **hazibadilishi** orodha ya asili (zinarudisha nakala).

**Moduli `muda`** (`leta muda`): `sasa`, `leo`, `mwaka`, `mwezi`, `siku` — husoma saa halisi
(si deterministic; majaribio ya golden huyaepuka). **Moduli `faili`**: `soma`, `andika`,
`ipo`, `futa`.

## Golden programs
See `examples/*.snil` and `examples/EXPECTED.md` — every component must make these
produce exactly the listed output.
