// course.ts — DARASA, the interactive learn-to-code course inside SNIL.
// Eight Kiswahili lessons, easy → hard, each with a concrete, checkable goal.
// Built by the Curriculum agent. Every `suluhisho` is verified to pass its `ukaguzi`
// by src/darasa/course.test.ts.
import type { Course } from './types';

export const COURSE: Course = {
  kichwa: 'DARASA — Jifunze Kuandika Programu kwa Kiswahili',
  utangulizi:
    'Karibu sana! Hii ni hatua yako ya kwanza katika ulimwengu wa programu — ' +
    'na utajifunza kwa lugha yako mwenyewe, Kiswahili, kwa kutumia SNIL. ' +
    'Kila somo ni fupi: tutaeleza wazo moja, kisha utajaribu mwenyewe. ' +
    'Andika kidogo, kosea, jaribu tena — ndivyo wanaoandika programu wote walivyojifunza. Twende pamoja!',
  masomo: [
    // ───────────────────────── Somo 1 ─────────────────────────
    {
      id: 'onyesha',
      kichwa: 'Somo 1 — onyesha: Kusema kitu',
      maelezo:
        'Amri ya kwanza kabisa ni "onyesha". Inachapisha (inaonyesha) kitu kwenye skrini. ' +
        'Maandishi yoyote yanaandikwa kati ya alama za nukuu mbili " ".\n\n' +
        'Mfano:\n' +
        'onyesha "Habari, dunia!"\n\n' +
        'Matokeo: Habari, dunia!',
      lengo:
        'Tumia "onyesha" kuchapisha ujumbe huu hasa:\n' +
        'Habari, dunia!',
      anzia:
        '# Tumia onyesha kuchapisha ujumbe\n' +
        '# andika hapa\n',
      ukaguzi: [
        { aina: 'haina_kosa' },
        { aina: 'inatumia', neno: 'onyesha' },
        { aina: 'matokeo_sawa', thamani: 'Habari, dunia!' },
      ],
      suluhisho: 'onyesha "Habari, dunia!"\n',
    },

    // ───────────────────────── Somo 2 ─────────────────────────
    {
      id: 'vigeu',
      kichwa: 'Somo 2 — Vigeu: Kuhifadhi taarifa kwa weka',
      maelezo:
        'Kigeu ni kama kasha lenye jina, ambalo huhifadhi thamani. ' +
        'Tunatumia "weka ... kuwa ..." kuunda kigeu. Baadaye unaweza kukitaja kwa jina lake.\n\n' +
        'Mfano:\n' +
        'weka jina kuwa "Asha"\n' +
        'onyesha jina\n\n' +
        'Matokeo: Asha',
      lengo:
        'Tengeneza kigeu "mji" chenye thamani "Dodoma", kisha kionyeshe.\n' +
        'Matokeo yanayotarajiwa:\n' +
        'Dodoma',
      anzia:
        '# Tengeneza kigeu mji kisha ukionyeshe\n' +
        'weka mji kuwa # malizia hapa\n',
      ukaguzi: [
        { aina: 'haina_kosa' },
        { aina: 'inatumia', neno: 'weka' },
        { aina: 'matokeo_sawa', thamani: 'Dodoma' },
      ],
      suluhisho: 'weka mji kuwa "Dodoma"\nonyesha mji\n',
    },

    // ───────────────────────── Somo 3 ─────────────────────────
    {
      id: 'hesabu',
      kichwa: 'Somo 3 — Hesabu na Maandishi: kuunganisha kwa +',
      maelezo:
        'SNIL inaweza kuhesabu: + (jumlisha), - (toa), * (zidisha), / (gawanya). ' +
        'Jambo zuri: ukitumia + na maandishi upande mmoja, SNIL inaunganisha maandishi na namba pamoja. ' +
        'Tumia mabano ( ) kuhakikisha hesabu inafanyika kwanza.\n\n' +
        'Mfano:\n' +
        'weka miaka kuwa 12\n' +
        'onyesha "Nina miaka " + miaka\n\n' +
        'Matokeo: Nina miaka 12',
      lengo:
        'Weka bei mbili: embe = 500 na ndizi = 300. Onyesha jumla yao kwa muundo huu hasa:\n' +
        'Jumla ni 800',
      anzia:
        'weka embe kuwa 500\n' +
        'weka ndizi kuwa 300\n' +
        '# onyesha "Jumla ni " + ... (jumlisha bei mbili)\n',
      ukaguzi: [
        { aina: 'haina_kosa' },
        { aina: 'inatumia', neno: '+' },
        { aina: 'matokeo_sawa', thamani: 'Jumla ni 800' },
      ],
      suluhisho:
        'weka embe kuwa 500\n' +
        'weka ndizi kuwa 300\n' +
        'onyesha "Jumla ni " + (embe + ndizi)\n',
    },

    // ───────────────────────── Somo 4 ─────────────────────────
    {
      id: 'masharti',
      kichwa: 'Somo 4 — Masharti: kufanya maamuzi kwa ikiwa',
      maelezo:
        'Mara nyingi programu huamua: ikiwa jambo ni kweli, fanya hili; vinginevyo, fanya lile. ' +
        'Tunatumia "ikiwa ... basi ... vinginevyo ... mwisho". Tunalinganisha kwa ==, !=, <, >, <=, >=. ' +
        'Usisahau "mwisho" kufunga sharti!\n\n' +
        'Mfano:\n' +
        'weka alama kuwa 75\n' +
        'ikiwa alama >= 50 basi\n' +
        '    onyesha "Umefaulu!"\n' +
        'vinginevyo\n' +
        '    onyesha "Jaribu tena."\n' +
        'mwisho',
      lengo:
        'Kigeu "alama" kimewekwa kuwa 40. Ikiwa alama ni 50 au zaidi, onyesha "Umefaulu"; ' +
        'vinginevyo onyesha "Umefeli".\n' +
        'Kwa alama 40, matokeo yanayotarajiwa:\n' +
        'Umefeli',
      anzia:
        'weka alama kuwa 40\n' +
        'ikiwa alama >= 50 basi\n' +
        '    # onyesha ujumbe wa kufaulu\n' +
        'vinginevyo\n' +
        '    # onyesha ujumbe wa kufeli\n' +
        'mwisho\n',
      ukaguzi: [
        { aina: 'haina_kosa' },
        { aina: 'inatumia', neno: 'ikiwa' },
        { aina: 'inatumia', neno: 'vinginevyo' },
        { aina: 'matokeo_sawa', thamani: 'Umefeli' },
      ],
      suluhisho:
        'weka alama kuwa 40\n' +
        'ikiwa alama >= 50 basi\n' +
        '    onyesha "Umefaulu"\n' +
        'vinginevyo\n' +
        '    onyesha "Umefeli"\n' +
        'mwisho\n',
    },

    // ───────────────────────── Somo 5 ─────────────────────────
    {
      id: 'vitanzi-kutoka-hadi',
      kichwa: 'Somo 5 — Vitanzi: kurudia kwa kwa kila (kutoka..hadi)',
      maelezo:
        'Vitanzi hurudia amri bila kuandika tena na tena. ' +
        '"kwa kila n kutoka 1 hadi 5" hupitia namba 1, 2, 3, 4, 5 ' +
        '(mwanzo na mwisho vyote vimo). Funga kitanzi kwa "mwisho".\n\n' +
        'Mfano:\n' +
        'kwa kila n kutoka 1 hadi 3\n' +
        '    onyesha n\n' +
        'mwisho\n\n' +
        'Matokeo:\n1\n2\n3',
      lengo:
        'Tumia "kwa kila" kuonyesha hesabu za 2 kuanzia 1 hadi 5 (yaani onyesha n * 2).\n' +
        'Matokeo yanayotarajiwa:\n' +
        '2\n4\n6\n8\n10',
      anzia:
        'kwa kila n kutoka 1 hadi 5\n' +
        '    # onyesha n mara mbili\n' +
        'mwisho\n',
      ukaguzi: [
        { aina: 'haina_kosa' },
        { aina: 'inatumia', neno: 'kwa kila' },
        { aina: 'inatumia', neno: 'kutoka' },
        { aina: 'matokeo_sawa', thamani: '2\n4\n6\n8\n10' },
      ],
      suluhisho:
        'kwa kila n kutoka 1 hadi 5\n' +
        '    onyesha n * 2\n' +
        'mwisho\n',
    },

    // ───────────────────────── Somo 6 ─────────────────────────
    {
      id: 'vitanzi-katika',
      kichwa: 'Somo 6 — Vitanzi katika orodha',
      maelezo:
        'Unaweza kupitia kila kitu katika orodha kwa "kwa kila kitu katika orodha". ' +
        'Orodha [ ... ] ni mfululizo wa vitu.\n\n' +
        'Mfano:\n' +
        'weka matunda kuwa ["embe", "ndizi"]\n' +
        'kwa kila t katika matunda\n' +
        '    onyesha t\n' +
        'mwisho\n\n' +
        'Matokeo:\nembe\nndizi',
      lengo:
        'Orodha "wanyama" ina ["simba", "tembo", "twiga"]. Tumia "kwa kila ... katika" ' +
        'kuonyesha kila mnyama kwenye mstari wake.\n' +
        'Matokeo yanayotarajiwa:\n' +
        'simba\ntembo\ntwiga',
      anzia:
        'weka wanyama kuwa ["simba", "tembo", "twiga"]\n' +
        'kwa kila mnyama katika wanyama\n' +
        '    # onyesha mnyama\n' +
        'mwisho\n',
      ukaguzi: [
        { aina: 'haina_kosa' },
        { aina: 'inatumia', neno: 'katika' },
        { aina: 'matokeo_sawa', thamani: 'simba\ntembo\ntwiga' },
      ],
      suluhisho:
        'weka wanyama kuwa ["simba", "tembo", "twiga"]\n' +
        'kwa kila mnyama katika wanyama\n' +
        '    onyesha mnyama\n' +
        'mwisho\n',
    },

    // ───────────────────────── Somo 7 ─────────────────────────
    {
      id: 'kazi',
      kichwa: 'Somo 7 — Kazi: amri yako mwenyewe kwa rudisha',
      maelezo:
        'Kazi ni kikundi cha amri chenye jina, ambacho unaweza kukiita mara nyingi. ' +
        'Hupokea vigezo (pembejeo) na hutoa jibu kwa "rudisha". Funga kwa "mwisho".\n\n' +
        'Mfano:\n' +
        'kazi salimu(jina)\n' +
        '    rudisha "Habari, " + jina + "!"\n' +
        'mwisho\n' +
        'onyesha salimu("Juma")\n\n' +
        'Matokeo: Habari, Juma!',
      lengo:
        'Andika kazi "eneo(urefu, upana)" inayorudisha urefu * upana, kisha onyesha ' +
        'eneo la chumba chenye urefu 4 na upana 3 kwa muundo huu hasa:\n' +
        'Eneo ni 12',
      anzia:
        'kazi eneo(urefu, upana)\n' +
        '    # rudisha eneo (urefu mara upana)\n' +
        'mwisho\n' +
        '# onyesha "Eneo ni " + eneo(4, 3)\n',
      ukaguzi: [
        { aina: 'haina_kosa' },
        { aina: 'inatumia', neno: 'kazi' },
        { aina: 'inatumia', neno: 'rudisha' },
        { aina: 'matokeo_sawa', thamani: 'Eneo ni 12' },
      ],
      suluhisho:
        'kazi eneo(urefu, upana)\n' +
        '    rudisha urefu * upana\n' +
        'mwisho\n' +
        'onyesha "Eneo ni " + eneo(4, 3)\n',
    },

    // ───────────────────────── Somo 8 ─────────────────────────
    {
      id: 'orodha-na-idadi',
      kichwa: 'Somo 8 — Orodha na Kamusi: kuhifadhi vitu vingi',
      maelezo:
        'Orodha [ ... ] huhifadhi vitu vingi. "ongeza X kwenye orodha" huongeza kitu, ' +
        'na "idadi(orodha)" hukuambia idadi ya vitu. Kamusi { ufunguo: thamani } huhifadhi ' +
        'vitu kwa majina; tunafikia thamani kwa kamusi.ufunguo.\n\n' +
        'Mfano:\n' +
        'weka matunda kuwa ["embe", "ndizi"]\n' +
        'ongeza "papai" kwenye matunda\n' +
        'onyesha idadi(matunda)\n\n' +
        'Matokeo: 3',
      lengo:
        'Orodha "marafiki" ina ["Asha", "Juma"]. Ongeza "Neema" kwenye orodha, ' +
        'kisha onyesha idadi ya marafiki.\n' +
        'Matokeo yanayotarajiwa:\n' +
        '3',
      anzia:
        'weka marafiki kuwa ["Asha", "Juma"]\n' +
        '# ongeza "Neema" kwenye marafiki\n' +
        '# onyesha idadi(marafiki)\n',
      ukaguzi: [
        { aina: 'haina_kosa' },
        { aina: 'inatumia', neno: 'ongeza' },
        { aina: 'inatumia', neno: 'idadi' },
        { aina: 'matokeo_sawa', thamani: '3' },
      ],
      suluhisho:
        'weka marafiki kuwa ["Asha", "Juma"]\n' +
        'ongeza "Neema" kwenye marafiki\n' +
        'onyesha idadi(marafiki)\n',
    },
  ],
};
