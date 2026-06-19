# SNIL — Swahili Native Intent Language

**Lugha ya kompyuta ya Kiswahili — yenye utambulisho wake.** Na Laetoli Ltd.

SNIL si tafsiri ya Python. SNIL ni lugha huru: ina sarufi yake, maneno-msingi ya
Kiswahili, makosa ya Kiswahili, na maktaba yake. Inakimbia kwa njia mbili:

- **Interpreter (kivinjari)** — andika SNIL, ione matokeo papo hapo, bila kusakinisha. Hii ni playground ya elimu.
- **Python codegen** — SNIL i-compile kwenda Python (target ya kwanza; baadaye JS/Go/Rust/Java/C#) ili kujenga software halisi.

```
onyesha "Habari Dunia"
```

## Muundo
- `src/lang/tokens.ts` — alfabeti ya tokeni (maneno-msingi ya Kiswahili)
- `src/lang/ast.ts` — mti wa sintaksia (mkataba wa lugha)
- `src/lang/errors.ts` — makosa ya Kiswahili
- `src/lang/lexer.ts` · `parser.ts` — chanzo → tokeni → AST
- `src/lang/interpreter.ts` · `stdlib.ts` — kutekeleza (kivinjari)
- `src/lang/codegen_python.ts` — AST → Python
- `src/lang/index.ts` — API ya umma: `tokenize`, `parse`, `run`, `toPython`
- `src/App.tsx` — playground
- `GRAMMAR.md` — sarufi rasmi · `examples/` — mifano + matokeo yanayotarajiwa

## Amri
```
npm install
npm run dev      # playground (port 5200)
npm test         # vitest
npm run build
```

Imejengwa chini ya mfumo wa Laetoli. Katiba, falsafa, na spec: ona folda ya nyaraka za SNIL.
