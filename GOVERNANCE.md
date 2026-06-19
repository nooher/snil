# Utawala wa SNIL — SNIL Governance

**Swahili Native Intent Language (SNIL)** · Laetoli Ltd

Hati hii inaeleza jinsi SNIL inavyotawaliwa: vyombo vinavyoongoza lugha, majukumu
yao, na jinsi mabadiliko yanavyopendekezwa na kuidhinishwa. (*This document
describes how SNIL is governed: the bodies that lead the language, their
responsibilities, and how changes are proposed and accepted.*)

> Utawala wote uko chini ya [Katiba ya SNIL](./CONSTITUTION.md). Pale ambapo hati hii
> na Katiba zinapingana, **Katiba inashinda.** (*All governance is subordinate to the
> Constitution; where they conflict, the Constitution prevails.*)

---

## Misingi ya utawala — Governing principles

1. **Katiba ni ya juu zaidi.** Hakuna uamuzi wa utawala unaoweza kukiuka Katiba
   (ona Ibara ya 13 na 14).
2. **Kiswahili kwanza.** Kila neno-msingi jipya lazima liwe la Kiswahili, wazi, la
   kawaida, na rahisi kufundisha (Ibara ya 6).
3. **Urahisi na elimu mbele ya yote.** Kipengele kinachoongeza ugumu bila thamani ya
   kielimu kinaweza kukataliwa (Ibara ya 4, 7, 14).
4. **Uthabiti.** Uoanifu na matoleo ya nyuma (*backward compatibility*) ni lengo
   muhimu; syntax haibadilishwi bila sababu kubwa (Ibara ya 9).

---

## Vyombo vya uongozi — Governing bodies

SNIL inaongozwa na vyombo vitatu, kama ilivyoainishwa katika Pendekezo la mradi
(*Project Proposal*).

### 1. Baraza la Lugha — Language Council

Chombo cha juu zaidi cha lugha. Ndicho mlinzi wa Katiba.

**Majukumu (responsibilities):**

- Kuidhinisha sintaksia na maneno-msingi mapya (*syntax approval*).
- Kuweka na kudumisha viwango vya lugha (*standards*).
- Kulinda uoanifu na matoleo ya nyuma (*backward compatibility*).
- Kulinda Katiba na kuongoza mwelekeo wa jumla wa lugha.

Baraza la Lugha pekee ndilo lenye mamlaka ya kuidhinisha mabadiliko ya sarufi
([GRAMMAR.md](./GRAMMAR.md)) na alfabeti ya maneno-msingi.

### 2. Kamati ya Kiufundi — Technical Committee

**Majukumu (responsibilities):**

- Mkalimani na utengenezaji wa Python (*compiler / transpiler*).
- Mazingira ya utekelezaji (*runtime*).
- Zana za watengenezaji (*tooling*): CLI, kiendelezi cha VS Code, n.k.

Kamati hii hutekeleza maamuzi yaliyoidhinishwa na Baraza la Lugha; haibuni
sintaksia mpya yenyewe.

### 3. Kamati ya Elimu — Education Committee

**Majukumu (responsibilities):**

- Mtaala (*curriculum*) — ikiwemo [DARASA.md](./DARASA.md).
- Mafunzo na miongozo ya walimu (*training*).
- Ushirikiano na shule, vyuo na taasisi (*academic partnerships*).

Kamati hii inahakikisha kila kipengele kinaweza kufundishwa, ikilinda kipaumbele cha
elimu (Ibara ya 7).

---

## Jinsi mabadiliko yanavyopendekezwa — How changes are proposed (RFC)

Mabadiliko makubwa (neno-msingi jipya, mabadiliko ya sintaksia, kipengele kipya cha
lugha au maktaba) hufuata mchakato wa **RFC** (*Request for Comments* — Ombi la
Maoni).

1. **Pendekezo (Proposal).** Mwandishi huandika RFC inayoeleza:
   - tatizo linalotatuliwa,
   - sintaksia/tabia inayopendekezwa (kwa mifano),
   - athari kwa uoanifu wa nyuma,
   - thamani ya kielimu,
   - jinsi inavyoheshimu Katiba (hasa Ibara ya 4, 6, 7, 9, 14).
2. **Majadiliano (Discussion).** Jamii na vyombo husika hutoa maoni kwa wazi.
3. **Mapitio (Review).** Chombo husika hupitia RFC:
   - sintaksia/maneno-msingi → **Baraza la Lugha**,
   - compiler/runtime/zana → **Kamati ya Kiufundi**,
   - mtaala/elimu → **Kamati ya Elimu**.
4. **Uamuzi (Decision).** Baraza la Lugha hutoa idhini ya mwisho kwa mabadiliko
   yoyote ya lugha. RFC **lazima** ikataliwe ikiwa inakiuka Ibara ya 14
   (inaongeza ugumu mkubwa, inapunguza usomekaji, inavunja Kiswahili First, au
   inakiuka falsafa ya elimu).
5. **Utekelezaji (Implementation).** Kamati ya Kiufundi hutekeleza, ikiongeza
   majaribio (`*.test.ts`) na, panapohitajika, mifano katika `examples/` na somo
   katika [DARASA.md](./DARASA.md).

### Kigezo cha neno-msingi jipya — Test for a new keyword

Kabla ya kuidhinishwa, kila neno-msingi jipya lazima lijibu **ndiyo** kwa yote:

- Je, ni la **Kiswahili**?
- Je, ni **wazi** na la **kawaida**?
- Je, ni **rahisi kufundisha** kwa mwanafunzi asiye na uzoefu?
- Je, linadumisha **uthabiti** na linaheshimu sintaksia iliyopo?

(*Constitution, Article 6 & 14.*)

---

## Uoanifu na matoleo — Compatibility and versioning

- Mabadiliko yanayovunja uoanifu (*breaking changes*) yanakatazwa isipokuwa kwa
  sababu kubwa iliyoidhinishwa na Baraza la Lugha (Ibara ya 9).
- Sintaksia rasmi ni [GRAMMAR.md](./GRAMMAR.md); mkalimani na codegen lazima
  vikubaliane nayo, na mifano ya `examples/EXPECTED.md` ni vipimo vya dhahabu
  (*golden tests*).

---

## Leseni na uwazi — License and openness

Specification ya SNIL itabaki wazi kwa kusomwa, kufundishwa, kutafitiwa na
kuboreshwa (Ibara ya 11). Leseni rasmi inakamilishwa na Laetoli Ltd.

---

*Imechapishwa na Laetoli Ltd. Utawala huu unaweza kuboreshwa kwa kufuata mchakato
wake wenyewe wa RFC, mradi unaendelea kuheshimu [Katiba](./CONSTITUTION.md).*
