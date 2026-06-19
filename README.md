# SNIL — Swahili Native Intent Language

**Lugha huru ya kompyuta ya Kiswahili — yenye utambulisho wake.** Bendera ya
Laetoli Ltd. *(A sovereign Kiswahili programming language — a Laetoli flagship.)*

SNIL ni lugha ya programu iliyoundwa kwa wazungumzaji wa Kiswahili kuanzia msingi:
ina sarufi yake, maneno-msingi ya Kiswahili, makosa ya Kiswahili, na maktaba yake.
Si tafsiri ya Python wala lugha nyingine — ni lugha huru inayowezesha mtu yeyote
anayezungumza Kiswahili kujifunza, kufundisha na kujenga programu kupitia lugha yake
mwenyewe. *(SNIL is a programming language built from the ground up for Kiswahili
speakers: its own grammar, Kiswahili keywords, Kiswahili errors, and its own
standard library. It is not a translation of Python — it is a language of its own.)*

```snil
weka jina kuwa "Asha"
onyesha "Habari, " + jina + "!"

kwa kila n kutoka 1 hadi 3
    onyesha n
mwisho
```

## Maumbile mawili — Dual nature

SNIL inakimbia kwa njia mbili:

- **Interpreter (kivinjari)** — andika SNIL, uone matokeo papo hapo, bila
  kusakinisha chochote. Hii ni *playground* ya elimu.
- **Python codegen** — SNIL i-compile kwenda Python (target ya kwanza) ili kujenga
  software halisi.

Tabia na maonyesho ni **sawasawa** kati ya njia zote mbili (ona `examples/EXPECTED.md`).

## Vipengele muhimu — Key features

- **CLI** (`endesha` / `tengeneza` / `nadhifu`) ya kuendesha, kutafsiri kwenda
  Python, na kunadhifisha programu nje ya kivinjari.
- **Kiendelezi cha VS Code** (`vscode-snil/`) — *syntax highlighting* kwa faili `.snil`.
- **DARASA** ([DARASA.md](./DARASA.md)) — masomo ya hatua kwa hatua ya kujifunza
  programu kwa Kiswahili (pia hujengwa ndani ya app, ona `src/darasa/`).
- **Makosa ya Kiswahili** — kila kosa la mkalimani huelezwa kwa Kiswahili na nambari
  ya mstari.
- **Maktaba ya kawaida** — moduli `hisabati`, `maandishi`, `orodha`, `muda`, `faili`.

## Amri — Commands

```bash
npm install        # sakinisha (install)
npm run dev        # playground ya kivinjari (port 5200)
npm test           # majaribio (vitest)
npm run build      # type-check + jenga
```

CLI (nje ya kivinjari):

```bash
npm run snil endesha   examples/habari.snil                 # tekeleza programu
npm run snil tengeneza examples/hesabu.snil --toka out.py   # tafsiri kwenda Python
npm run snil nadhifu   examples/duka.snil --badili          # nadhifisha mpangilio
npm run snil msaada                                         # onyesha msaada
```

## Nyaraka — Documentation

- [CONSTITUTION.md](./CONSTITUTION.md) — Katiba ya SNIL (nyaraka kuu inayotawala).
- [GOVERNANCE.md](./GOVERNANCE.md) — mfumo wa utawala (Baraza la Lugha, Kamati za
  Kiufundi na Elimu, mchakato wa RFC).
- [CONTRIBUTING.md](./CONTRIBUTING.md) — jinsi ya kuchangia.
- [GRAMMAR.md](./GRAMMAR.md) — sarufi rasmi (Grammar v1.0).
- [DARASA.md](./DARASA.md) — jifunze kuandika programu kwa Kiswahili.
- [SECURITY.md](./SECURITY.md) — sera ya usalama.

## Muundo wa msimbo — Code structure

- `src/lang/` — moyo wa lugha: `tokens`, `ast`, `errors`, `lexer`, `parser`,
  `interpreter`, `stdlib`, `codegen_python`, `format`, `diagnose`, `index`.
- `src/darasa/` — injini ya DARASA (mtaala + ukaguzi wa mazoezi).
- `src/App.tsx` — playground.
- `scripts/snil.ts` — CLI.
- `vscode-snil/` — kiendelezi cha VS Code.
- `examples/` — mifano (`*.snil`) + matokeo yanayotarajiwa (`EXPECTED.md`).

## Leseni — License

Leseni rasmi ya SNIL inakamilishwa na Laetoli Ltd. Specification itabaki wazi kwa
kusomwa, kufundishwa, kutafitiwa na kuboreshwa (ona Katiba, Ibara ya 11).
*(The official license is being finalized by Laetoli Ltd; the specification remains
open to be read, taught, researched and improved.)*

---

Imejengwa chini ya mfumo wa Laetoli — bendera ya lugha huru ya Kiswahili.
*A Laetoli flagship.*
