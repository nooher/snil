// Marejeo.tsx — SNIL language reference (Kiswahili). Scannable documentation:
// maneno-msingi (keywords), aina za data, waendeshaji (operators + precedence),
// miundo (control structures) with tiny snippets, and maktaba ya kawaida (stdlib).
// All content is accurate to GRAMMAR.md + tokens.ts. Pure presentation — no lang imports.

// ---- maneno-msingi: neno → maana (from tokens.ts KEYWORDS + GRAMMAR) ----
const MANENO: { neno: string; maana: string }[] = [
  { neno: 'onyesha', maana: 'chapisha thamani / matokeo' },
  { neno: 'weka … kuwa', maana: 'tangaza kigeu na thamani yake' },
  { neno: 'uliza … kuwa', maana: 'pokea ingizo kutoka kwa mtumiaji' },
  { neno: 'ikiwa … basi', maana: 'sharti (if … then)' },
  { neno: 'vinginevyo', maana: 'sivyo (else)' },
  { neno: 'mwisho', maana: 'funga block lolote' },
  { neno: 'kwa kila … katika', maana: 'pitia kila kitu katika orodha' },
  { neno: 'kwa kila … kutoka … hadi', maana: 'pitia namba (mwisho ujumuishwe)' },
  { neno: 'wakati', maana: 'rudia maadamu sharti ni kweli (while)' },
  { neno: 'kazi', maana: 'tengeneza kazi (function)' },
  { neno: 'rudisha', maana: 'rudisha thamani kutoka kwa kazi' },
  { neno: 'jaribu … kosa', maana: 'shika hitilafu (try … catch)' },
  { neno: 'leta', maana: 'leta moduli ya maktaba' },
  { neno: 'ongeza … kwenye', maana: 'ongeza kitu kwenye orodha' },
  { neno: 'ondoa … kutoka', maana: 'ondoa kitu kutoka orodha' },
  { neno: 'andika … kwenye', maana: 'andika data kwenye faili' },
  { neno: 'soma … kuwa', maana: 'soma faili kuwa kigeu' },
  { neno: 'na · au · sio', maana: 'mantiki: na (and), au (or), sio (not)' },
  { neno: 'kweli · si_kweli · tupu', maana: 'kweli, uongo, na thamani tupu' },
];

// ---- aina za data ----
const AINA: { jina: string; mfano: string; maelezo: string }[] = [
  { jina: 'Namba', mfano: '10   3.14', maelezo: 'namba kamili au desimali' },
  { jina: 'Maandishi', mfano: '"Habari"', maelezo: 'mfuatano wa herufi; \\n \\t \\" \\\\' },
  { jina: 'Kweli', mfano: 'kweli / si_kweli', maelezo: 'thamani ya kimantiki' },
  { jina: 'Tupu', mfano: 'tupu', maelezo: 'kutokuwepo kwa thamani (null)' },
  { jina: 'Orodha', mfano: '["embe", "ndizi"]', maelezo: 'mfululizo wa vitu; fikia kwa x[0]' },
  { jina: 'Kamusi', mfano: '{ jina: "Ali", umri: 20 }', maelezo: 'jozi za ufunguo→thamani; fikia kwa x.jina' },
];

// ---- waendeshaji: precedence low → high (GRAMMAR §Operators) ----
const WAENDESHAJI: { kiwango: string; alama: string; maana: string }[] = [
  { kiwango: '1 (chini)', alama: 'au', maana: 'au — mojawapo ni kweli' },
  { kiwango: '2', alama: 'na', maana: 'na — zote ni kweli' },
  { kiwango: '3', alama: '==  !=  <  >  <=  >=', maana: 'kulinganisha' },
  { kiwango: '4', alama: '+  -', maana: 'jumlisha / toa (+ pia huunganisha maandishi)' },
  { kiwango: '5', alama: '*  /  %', maana: 'zidisha / gawanya / baki (modulo)' },
  { kiwango: '6', alama: 'sio   -x', maana: 'kanusho na hasi (unary)' },
  { kiwango: '7 (juu)', alama: 'f(…)   x[…]   x.k', maana: 'wito, faharasa, kiungo' },
];

// ---- miundo: control structures with tiny snippets ----
const MIUNDO: { kichwa: string; chanzo: string }[] = [
  {
    kichwa: 'ikiwa / vinginevyo',
    chanzo: `ikiwa alama >= 50 basi
    onyesha "amefaulu"
vinginevyo
    onyesha "amefeli"
mwisho`,
  },
  {
    kichwa: 'kwa kila — orodha',
    chanzo: `kwa kila b katika bidhaa
    onyesha b
mwisho`,
  },
  {
    kichwa: 'kwa kila — namba',
    chanzo: `kwa kila n kutoka 1 hadi 5
    onyesha n
mwisho`,
  },
  {
    kichwa: 'wakati',
    chanzo: `weka i kuwa 0
wakati i < 3
    onyesha i
    i = i + 1
mwisho`,
  },
  {
    kichwa: 'kazi',
    chanzo: `kazi salamu(jina)
    rudisha "Habari " + jina
mwisho
onyesha salamu("Asha")`,
  },
  {
    kichwa: 'jaribu / kosa',
    chanzo: `jaribu
    weka n kuwa namba("abc")
kosa
    onyesha "Si namba halali"
mwisho`,
  },
];

// ---- maktaba ya kawaida (stdlib) — exact list from GRAMMAR.md ----
const BUILTINS: { kazi: string; maana: string }[] = [
  { kazi: 'idadi(x)', maana: 'urefu wa orodha au maandishi' },
  { kazi: 'namba(x)', maana: 'geuza kuwa namba (kosa ikiwa si halali)' },
  { kazi: 'maandishi(x)', maana: 'geuza kuwa mfuatano wa maandishi wa SNIL' },
  { kazi: 'mzunguko(x)', maana: 'zungusha hadi namba kamili (nusu → juu)' },
  { kazi: 'kamili(x)', maana: 'thamani kamili / chanya (absolute)' },
];

const MODULI: { jina: string; leta: string; kazi: { kazi: string; maana: string }[] }[] = [
  {
    jina: 'hisabati',
    leta: 'leta hisabati',
    kazi: [
      { kazi: 'jumla(orodha)', maana: 'jumla ya vipengele' },
      { kazi: 'wastani(orodha)', maana: 'wastani (mean)' },
      { kazi: 'kiwango_cha_juu(orodha)', maana: 'thamani kubwa zaidi' },
      { kazi: 'kiwango_cha_chini(orodha)', maana: 'thamani ndogo zaidi' },
      { kazi: 'mzizi(x)', maana: 'mzizi wa pili (square root)' },
      { kazi: 'kipeo(msingi, kipeo)', maana: 'msingi kwa kipeo (power)' },
    ],
  },
  {
    jina: 'maandishi',
    leta: 'leta maandishi',
    kazi: [
      { kazi: 'herufi_kubwa(s)', maana: 'geuza kuwa herufi kubwa' },
      { kazi: 'herufi_ndogo(s)', maana: 'geuza kuwa herufi ndogo' },
      { kazi: 'unganisha(orodha, kitenganishi)', maana: 'unganisha kuwa maandishi' },
      { kazi: 'gawanya(maandishi, kitenganishi)', maana: 'gawanya kuwa orodha' },
      { kazi: 'ina(maneno, sehemu)', maana: 'je, maneno yana sehemu?' },
      { kazi: 'badilisha(maneno, ya_zamani, mpya)', maana: 'badilisha matukio yote' },
      { kazi: 'ondoa_nafasi(maneno)', maana: 'ondoa nafasi za pembeni (trim)' },
    ],
  },
  {
    jina: 'orodha',
    leta: 'leta orodha',
    kazi: [
      { kazi: 'panga(orodha)', maana: 'nakala iliyopangwa kwa kupanda' },
      { kazi: 'geuza(orodha)', maana: 'nakala iliyopinduliwa' },
      { kazi: 'ina(orodha, kitu)', maana: 'je, orodha ina kitu?' },
    ],
  },
  {
    jina: 'muda',
    leta: 'leta muda',
    kazi: [
      { kazi: 'sasa', maana: 'muda wa sasa' },
      { kazi: 'leo', maana: 'tarehe ya leo' },
      { kazi: 'mwaka · mwezi · siku', maana: 'sehemu za tarehe halisi' },
    ],
  },
  {
    jina: 'faili',
    leta: 'leta faili',
    kazi: [
      { kazi: 'soma(jina)', maana: 'soma yaliyomo ya faili' },
      { kazi: 'andika(jina, data)', maana: 'andika data kwenye faili' },
      { kazi: 'ipo(jina)', maana: 'je, faili lipo?' },
      { kazi: 'futa(jina)', maana: 'futa faili' },
    ],
  },
];

export function Marejeo() {
  return (
    <div className="marejeo">
      <header className="marejeo-kichwa">
        <h1>Marejeo ya SNIL</h1>
        <p>
          Rejea kamili ya lugha: maneno-msingi, aina za data, waendeshaji, miundo,
          na maktaba ya kawaida.
        </p>
      </header>

      {/* maneno-msingi */}
      <section className="marejeo-sehemu">
        <h2 className="marejeo-h2">Maneno-msingi</h2>
        <table className="marejeo-jedwali">
          <thead>
            <tr>
              <th>Neno</th>
              <th>Maana</th>
            </tr>
          </thead>
          <tbody>
            {MANENO.map((m) => (
              <tr key={m.neno}>
                <td className="mono">{m.neno}</td>
                <td>{m.maana}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* aina za data */}
      <section className="marejeo-sehemu">
        <h2 className="marejeo-h2">Aina za data</h2>
        <div className="marejeo-kadi-grid">
          {AINA.map((a) => (
            <article className="marejeo-kadi" key={a.jina}>
              <h3>{a.jina}</h3>
              <code className="marejeo-kadi-mfano">{a.mfano}</code>
              <p>{a.maelezo}</p>
            </article>
          ))}
        </div>
      </section>

      {/* waendeshaji */}
      <section className="marejeo-sehemu">
        <h2 className="marejeo-h2">Waendeshaji</h2>
        <p className="marejeo-sehemu-maelezo">
          Mpangilio wa kipaumbele (chini → juu). Waendeshaji wa juu hutekelezwa kwanza.
        </p>
        <table className="marejeo-jedwali">
          <thead>
            <tr>
              <th>Kiwango</th>
              <th>Alama</th>
              <th>Maana</th>
            </tr>
          </thead>
          <tbody>
            {WAENDESHAJI.map((w) => (
              <tr key={w.kiwango}>
                <td>{w.kiwango}</td>
                <td className="mono">{w.alama}</td>
                <td>{w.maana}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* miundo */}
      <section className="marejeo-sehemu">
        <h2 className="marejeo-h2">Miundo</h2>
        <div className="marejeo-miundo-grid">
          {MIUNDO.map((m) => (
            <article className="marejeo-muundo" key={m.kichwa}>
              <h3>{m.kichwa}</h3>
              <pre className="marejeo-code">{m.chanzo}</pre>
            </article>
          ))}
        </div>
      </section>

      {/* maktaba ya kawaida */}
      <section className="marejeo-sehemu">
        <h2 className="marejeo-h2">Maktaba ya kawaida</h2>

        <h3 className="marejeo-h3">Kazi za kila mahali</h3>
        <p className="marejeo-sehemu-maelezo">Hazihitaji <code className="mono">leta</code>.</p>
        <table className="marejeo-jedwali">
          <tbody>
            {BUILTINS.map((b) => (
              <tr key={b.kazi}>
                <td className="mono">{b.kazi}</td>
                <td>{b.maana}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {MODULI.map((mod) => (
          <div className="marejeo-moduli" key={mod.jina}>
            <h3 className="marejeo-h3">
              Moduli <span className="mono">{mod.jina}</span>
              <span className="marejeo-leta mono">{mod.leta}</span>
            </h3>
            <table className="marejeo-jedwali">
              <tbody>
                {mod.kazi.map((k) => (
                  <tr key={k.kazi}>
                    <td className="mono">{k.kazi}</td>
                    <td>{k.maana}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <footer className="marejeo-chini">
        <span className="karibu-chini-jina">SNIL · Laetoli</span>
        <span className="dot">·</span>
        <a
          className="karibu-chini-link"
          href="https://github.com/nooher/snil"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
