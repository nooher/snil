# Kuchangia SNIL — Contributing to SNIL

Karibu! Asante kwa kutaka kuchangia **SNIL**, lugha huru ya programu ya Kiswahili
na Laetoli Ltd. Mwongozo huu unaeleza jinsi ya kuanza na kanuni za kuchangia.
(*Welcome, and thank you for contributing to SNIL. This guide is bilingual —
Kiswahili first, with English where it helps.*)

> Kila mchango lazima uheshimu [Katiba ya SNIL](./CONSTITUTION.md) na ufuate
> [Utawala wa SNIL](./GOVERNANCE.md). (*Every contribution must respect the
> Constitution and follow the Governance model.*)

---

## Anza hapa — Getting started

```bash
npm install        # sakinisha (install dependencies)
npm run dev        # playground ya kivinjari (browser playground, port 5200)
npm test           # endesha majaribio (run the test suite, vitest)
npm run build      # type-check + jenga (tsc -b && vite build)
```

Endesha au tafsiri programu nje ya kivinjari kwa CLI:

```bash
npm run snil endesha examples/habari.snil               # tekeleza
npm run snil tengeneza examples/hesabu.snil --toka out.py # tafsiri kwenda Python
npm run snil nadhifu examples/duka.snil --badili         # nadhifisha mpangilio
```

---

## Mahali pa msimbo — Where the code lives

SNIL ni lugha huru: ina sarufi yake na maneno-msingi ya Kiswahili. Faili za
**mkataba wa lugha** ziko katika `src/lang/`:

- `src/lang/tokens.ts` — alfabeti ya tokeni / maneno-msingi (KEYWORDS).
- `src/lang/ast.ts` — mti wa sintaksia (*AST* — mkataba wa lugha).
- `src/lang/errors.ts` — makosa ya Kiswahili (`SnilError`).
- `src/lang/lexer.ts` · `parser.ts` — chanzo → tokeni → AST.
- `src/lang/interpreter.ts` · `stdlib.ts` — utekelezaji (kivinjari).
- `src/lang/codegen_python.ts` — AST → Python.
- `src/lang/format.ts` · `diagnose.ts` — unadhifishaji + ujumbe wa makosa.
- `src/lang/index.ts` — API ya umma: `tokenize`, `parse`, `run`, `toPython`.

Sarufi rasmi: [GRAMMAR.md](./GRAMMAR.md). Mtaala wa kujifunza: [DARASA.md](./DARASA.md).

---

## Kanuni ya neno-msingi — The keyword rule

Hii ni kanuni isiyobadilika kutoka Katiba (Ibara ya 6 na 14). **Kila neno-msingi
jipya lazima:**

- liwe la **Kiswahili**,
- liwe **wazi** na la **kawaida**,
- liwe **rahisi kufundisha**.

Maneno ya kigeni yatatumika tu pale ambapo hakuna mbadala wa Kiswahili wenye maana
sahihi. Pendekezo lolote linaloongeza ugumu mkubwa, kupunguza usomekaji, au
kuvunja sera ya Kiswahili-kwanza **litakataliwa**.

Mabadiliko ya sintaksia au maneno-msingi hupitia mchakato wa **RFC** ulioelezwa
katika [GOVERNANCE.md](./GOVERNANCE.md) na huidhinishwa na Baraza la Lugha.

---

## Kabla ya PR — Before you open a Pull Request

1. **Andika majaribio.** Kila kipengele kina majaribio yake (`*.test.ts` katika
   `src/lang/` na `src/darasa/`). Ongeza au sasisha majaribio kwa mabadiliko yako.
2. **Endesha majaribio:** `npm test` — yote lazima yapite (*green*).
3. **Angalia aina:** `npx tsc --noEmit -p tsconfig.json` — hakuna makosa.
4. **Uthabiti wa mkalimani na codegen.** Tabia na maonyesho lazima yawe **sawasawa**
   kati ya interpreter na Python codegen. Vipimo vya dhahabu viko katika
   `examples/*.snil` na `examples/EXPECTED.md` — lazima vitoke matokeo yale yale.
5. **Nadhifisha SNIL** uliyoongeza: `npm run snil nadhifu <faili> --badili`.

CI (`.github/workflows/ci.yml`) huendesha install → type-check → test → build kwa
kila PR. Mabadiliko hayauunganishwi mpaka CI iwe kijani.

---

## Mtindo wa msimbo — Code style

- TypeScript kali (*strict*); epuka `any` pasipo sababu.
- Ujumbe wote unaomwonekana mtumiaji (makosa, CLI, msaada) lazima uwe wa
  **Kiswahili** (Ibara ya 6).
- Weka maoni mafupi yanayoeleza *kwa nini*, si *nini*.
- Pendelea kuhariri faili zilizopo kuliko kuongeza mpya.

---

## Aina za michango — Kinds of contributions

- **Hitilafu (bugs):** fungua *issue* yenye programu ndogo ya SNIL inayoonyesha
  tatizo + matokeo unayotarajia.
- **Mtaala / nyaraka:** maboresho ya [DARASA.md](./DARASA.md), mifano, tafsiri.
- **Lugha (sintaksia/maneno-msingi):** anza na RFC — ona [GOVERNANCE.md](./GOVERNANCE.md).
- **Zana:** CLI (`scripts/`), kiendelezi cha VS Code (`vscode-snil/`).

Kwa masuala ya usalama, ona [SECURITY.md](./SECURITY.md).

Asante kwa kujenga lugha hii pamoja nasi. *Andika, kosea, jaribu tena.*
