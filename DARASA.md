# DARASA — Jifunze Kuandika Programu kwa Kiswahili

Karibu sana! Hii ni hatua yako ya kwanza katika ulimwengu wa programu — na utajifunza
kwa lugha yako mwenyewe, **Kiswahili**, kwa kutumia **SNIL**.

Hauhitaji uzoefu wowote wa awali. Kila somo ni fupi: tutaeleza wazo moja, tutakuonyesha
mfano mdogo, kisha utajaribu mwenyewe. Andika kidogo, kosea, jaribu tena — ndivyo
wanaoandika programu wote walivyojifunza. Twende pamoja!

---

## Somo la 1 — `onyesha`: Kusema kitu

Amri ya kwanza kabisa ni `onyesha`. Inachapisha (inaonyesha) kitu kwenye skrini.
Maandishi yoyote yanaandikwa kati ya alama za nukuu mbili `" "`.

```snil
onyesha "Habari, dunia!"
```

**Matokeo:** `Habari, dunia!`

**Jaribu mwenyewe:** Onyesha jina lako na shule yako kwa mistari miwili tofauti.

---

## Somo la 2 — Vigeu: Kuhifadhi taarifa kwa `weka`

Kigeu ni kama kasha lenye jina, ambalo huhifadhi thamani. Tunatumia `weka ... kuwa ...`
kuunda kigeu. Baadaye unaweza kukitaja kwa jina lake popote.

```snil
weka jina kuwa "Asha"
weka umri kuwa 12
onyesha jina
onyesha umri
```

**Matokeo:**
```
Asha
12
```

**Jaribu mwenyewe:** Tengeneza kigeu `mji` chenye jina la mji wako, kisha kionyeshe.

---

## Somo la 3 — Hesabu na Maandishi: kuunganisha kwa `+`

SNIL inaweza kuhesabu: `+` (jumlisha), `-` (toa), `*` (zidisha), `/` (gawanya),
na `%` (baki). Jambo zuri: ukitumia `+` na maandishi upande mmoja, SNIL **inaunganisha**
maandishi na namba pamoja. Tumia mabano `( )` kuhakikisha hesabu inafanyika kwanza.

```snil
weka miaka kuwa 12
onyesha "Nina miaka " + miaka
onyesha "Mwakani nitakuwa na " + (miaka + 1)
```

**Matokeo:**
```
Nina miaka 12
Mwakani nitakuwa na 13
```

**Jaribu mwenyewe:** Weka bei mbili za matunda, kisha onyesha "Jumla ni " na jumla yake.

---

## Somo la 4 — `uliza`: Kuzungumza na mtumiaji

Programu nzuri huuliza maswali. `uliza "..." kuwa kigeu` inamuuliza mtumiaji swali na
kuhifadhi jibu lake katika kigeu. Kisha unaweza kutumia jibu hilo.

```snil
uliza "Jina lako ni nani? " kuwa jina
onyesha "Karibu, " + jina
```

**Matokeo (kama mtumiaji ataandika Asha):**
```
Karibu, Asha
```

**Jaribu mwenyewe:** Muulize mtumiaji mji wake, kisha umkaribishe kwa jina la mji huo.

---

## Somo la 5 — Masharti: kufanya maamuzi kwa `ikiwa`

Mara nyingi programu huamua: *ikiwa* jambo ni kweli, fanya hili; *vinginevyo*, fanya
lile. Tunatumia `ikiwa ... basi ... vinginevyo ... mwisho`. Tunalinganisha kwa `==`,
`!=`, `<`, `>`, `<=`, `>=`. Usisahau `mwisho` kufunga sharti!

```snil
weka alama kuwa 75
ikiwa alama >= 50 basi
    onyesha "Umefaulu!"
vinginevyo
    onyesha "Jaribu tena."
mwisho
```

**Matokeo:** `Umefaulu!`

**Jaribu mwenyewe:** Weka kigeu `saa` (namba 1–24). Ikiwa ni chini ya 12, onyesha
"Habari za asubuhi", vinginevyo "Habari za mchana".

---

## Somo la 6 — Vitanzi: kurudia kwa `kwa kila` na `wakati`

Vitanzi hurudia amri bila kuandika tena na tena. Kuna njia mbili:

- `kwa kila n kutoka 1 hadi 5` — hupitia namba 1, 2, 3, 4, 5 (mwanzo na mwisho **vyote
  vimo**).
- `wakati sharti` — hurudia kadri sharti ni kweli (kumbuka kubadilisha kigeu ndani,
  vinginevyo kitanzi hakitaisha).

```snil
kwa kila n kutoka 1 hadi 5
    onyesha n
mwisho

weka i kuwa 1
wakati i <= 3
    onyesha "Mara ya " + i
    i = i + 1
mwisho
```

**Matokeo:**
```
1
2
3
4
5
Mara ya 1
Mara ya 2
Mara ya 3
```

**Jaribu mwenyewe:** Tumia `kwa kila` kuonyesha hesabu za 2 (2, 4, 6, 8, 10) —
dokezo: onyesha `n * 2`.

---

## Somo la 7 — Kazi: kutengeneza amri yako mwenyewe kwa `rudisha`

Kazi ni kikundi cha amri chenye jina, ambacho unaweza kukiita mara nyingi. Hupokea
*vigezo* (pembejeo) na hutoa jibu kwa `rudisha`. Hii inafanya programu yako iwe nadhifu
na rahisi kuelewa.

```snil
kazi salimu(jina)
    rudisha "Habari, " + jina + "!"
mwisho

onyesha salimu("Juma")
```

**Matokeo:** `Habari, Juma!`

**Jaribu mwenyewe:** Andika kazi `eneo(urefu, upana)` inayorudisha `urefu * upana`,
kisha onyesha eneo la chumba chenye urefu 4 na upana 3.

---

## Somo la 8 — Orodha na Kamusi: kuhifadhi vitu vingi

Wakati mwingine unahitaji kuhifadhi vitu vingi kwa pamoja.

- **Orodha** `[ ... ]` ni mfululizo wa vitu. `ongeza X kwenye orodha` huongeza kitu,
  na `idadi(orodha)` hukuambia idadi ya vitu. Unaweza kupitia orodha kwa `kwa kila`.
- **Kamusi** `{ ufunguo: thamani }` huhifadhi vitu kwa majina. Tunafikia thamani kwa
  `kamusi.ufunguo`.

```snil
weka matunda kuwa ["embe", "ndizi", "papai"]
ongeza "chungwa" kwenye matunda
onyesha idadi(matunda)
kwa kila t katika matunda
    onyesha t
mwisho

weka mwanafunzi kuwa { jina: "Neema", umri: 13 }
onyesha mwanafunzi.jina
onyesha mwanafunzi.umri
```

**Matokeo:**
```
4
embe
ndizi
papai
chungwa
Neema
13
```

**Jaribu mwenyewe:** Tengeneza orodha ya majina matatu ya marafiki zako, ongeza jina
la nne, kisha onyesha kila jina kwa kitanzi.

---

## Hongera!

Umejifunza mambo yote ya msingi ya SNIL: kuonyesha, vigeu, hesabu, kuuliza, masharti,
vitanzi, kazi, na orodha na kamusi. Sasa unaweza kuandika programu halisi!

Hatua inayofuata: fungua mifano katika folda ya `examples/` (kama `fizzbuzz.snil`,
`wastani.snil`, `pembetatu.snil`, na `kikokotoo.snil`) na ujaribu kuibadilisha.

**Endesha msimbo wako** kwa njia mbili:
- Andika moja kwa moja katika **playground ya SNIL** (kivinjari) na uone matokeo papo
  hapo, au
- Hifadhi faili kisha uendeshe kwa amri: `snil endesha faili.snil`.

Andika, kosea, jaribu tena — na ufurahie safari! 🚀
