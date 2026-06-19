// App.tsx — SNIL Playground. The friendliest way to write your first program in
// Kiswahili: edit, press Endesha, see output. Consumes only the public API from
// src/lang (parse/run/toPython); never reimplements the language.
import { useMemo, useState } from 'react';
import { run, toPython } from './lang';
import type { SnilError } from './lang';
import { formatError } from './lang/diagnose';
import { formatSnil } from './lang/format';
import { Darasa } from './Darasa';
import { Karibu } from './Karibu';
import { Marejeo } from './Marejeo';

type Modi = 'karibu' | 'playground' | 'jifunze' | 'marejeo';

const MODI_ORODHA: { id: Modi; lebo: string }[] = [
  { id: 'karibu', lebo: 'Karibu' },
  { id: 'playground', lebo: 'Playground' },
  { id: 'jifunze', lebo: 'Jifunze' },
  { id: 'marejeo', lebo: 'Marejeo' },
];

// --- Mifano (examples) — chanzo cha .snil kimewekwa hapa moja kwa moja ---
const MIFANO: { id: string; jina: string; maelezo: string; chanzo: string }[] = [
  {
    id: 'habari',
    jina: 'Habari',
    maelezo: 'Programu ya kwanza kabisa',
    chanzo: `# Programu ya kwanza kabisa katika SNIL
onyesha "Habari Dunia"
`,
  },
  {
    id: 'hesabu',
    jina: 'Hesabu',
    maelezo: 'Vigeu, kazi, masharti, kitanzi',
    chanzo: `# Vigeu, hesabu, kazi, masharti, na kitanzi
weka a kuwa 10
weka b kuwa 5
onyesha "Jumla ni " + (a + b)

kazi salamu(jina)
    rudisha "Habari " + jina
mwisho
onyesha salamu("Asha")

ikiwa a > b basi
    onyesha "a ni kubwa"
vinginevyo
    onyesha "b ni kubwa"
mwisho

kwa kila n kutoka 1 hadi 3
    onyesha n
mwisho
`,
  },
  {
    id: 'duka',
    jina: 'Duka',
    maelezo: 'Orodha, kamusi na vitanzi',
    chanzo: `# Orodha, Kamusi, na vitanzi — duka dogo
weka bidhaa kuwa ["embe", "ndizi", "chungwa"]
ongeza "papai" kwenye bidhaa
onyesha "Idadi ya bidhaa ni " + idadi(bidhaa)

kwa kila b katika bidhaa
    onyesha b
mwisho

weka mteja kuwa { jina: "Ali", umri: 20 }
onyesha mteja.jina

weka jumla kuwa 0
weka bei kuwa [500, 300, 800, 200]
kwa kila p katika bei
    jumla = jumla + p
mwisho
onyesha "Jumla ya bei ni " + jumla
`,
  },
  {
    id: 'fizzbuzz',
    jina: 'FizaBuzi',
    maelezo: 'Masharti na vitanzi',
    chanzo: `# FizaBuzi — hesabu 1 hadi 20.
# "Fiza" kwa vizidisho vya 3, "Buzi" kwa vya 5, "FizaBuzi" kwa vyote viwili.
kwa kila n kutoka 1 hadi 20
    ikiwa n % 3 == 0 na n % 5 == 0 basi
        onyesha "FizaBuzi"
    vinginevyo
        ikiwa n % 3 == 0 basi
            onyesha "Fiza"
        vinginevyo
            ikiwa n % 5 == 0 basi
                onyesha "Buzi"
            vinginevyo
                onyesha n
            mwisho
        mwisho
    mwisho
mwisho
`,
  },
  {
    id: 'wastani',
    jina: 'Wastani',
    maelezo: 'Alama za wanafunzi',
    chanzo: `# Wastani wa alama za wanafunzi.
# Tunahesabu jumla na wastani, kisha tunaonyesha kufaulu/kufeli kwa kila mwanafunzi.
weka alama kuwa [75, 48, 90, 33, 62]
weka jumla kuwa 0

kwa kila a katika alama
    jumla = jumla + a
    ikiwa a >= 50 basi
        onyesha "Alama " + a + ": amefaulu"
    vinginevyo
        onyesha "Alama " + a + ": amefeli"
    mwisho
mwisho

onyesha "Jumla ya alama ni " + jumla
onyesha "Wastani ni " + (jumla / idadi(alama))
`,
  },
  {
    id: 'pembetatu',
    jina: 'Pembetatu',
    maelezo: 'Vitanzi vilivyofumbatana',
    chanzo: `# Pembetatu ya nyota — vitanzi vilivyoingiana (nested loops).
# Kila safu ina nyota zaidi kuliko iliyotangulia.
kwa kila safu kutoka 1 hadi 5
    weka mstari kuwa ""
    kwa kila nyota kutoka 1 hadi safu
        mstari = mstari + "*"
    mwisho
    onyesha mstari
mwisho
`,
  },
  {
    id: 'kikokotoo',
    jina: 'Kikokotoo',
    maelezo: 'Kazi za hesabu',
    chanzo: `# Kikokotoo kidogo — kazi za jumlisha, toa, zidisha, na gawanya.
kazi jumlisha(x, y)
    rudisha x + y
mwisho

kazi toa(x, y)
    rudisha x - y
mwisho

kazi zidisha(x, y)
    rudisha x * y
mwisho

kazi gawanya(x, y)
    rudisha x / y
mwisho

onyesha "8 + 5 = " + jumlisha(8, 5)
onyesha "8 - 5 = " + toa(8, 5)
onyesha "8 * 5 = " + zidisha(8, 5)
onyesha "8 / 4 = " + gawanya(8, 4)
`,
  },
];

// Maneno-msingi ya kuonyesha mwanafunzi (kutoka tokens.ts KEYWORDS).
const MANENO_MSINGI: { neno: string; maana: string }[] = [
  { neno: 'onyesha', maana: 'chapisha' },
  { neno: 'weka … kuwa', maana: 'tangaza kigeu' },
  { neno: 'uliza … kuwa', maana: 'pokea jibu' },
  { neno: 'ikiwa … basi', maana: 'kama' },
  { neno: 'vinginevyo', maana: 'sivyo' },
  { neno: 'kwa kila … katika', maana: 'pitia orodha' },
  { neno: 'kutoka … hadi', maana: 'pitia namba' },
  { neno: 'wakati', maana: 'rudia' },
  { neno: 'kazi … rudisha', maana: 'tengeneza kazi' },
  { neno: 'ongeza … kwenye', maana: 'ongeza kwenye orodha' },
  { neno: 'idadi(x)', maana: 'urefu' },
  { neno: 'mwisho', maana: 'funga block' },
];

type Kichupo = 'matokeo' | 'python';

export function App() {
  const [modi, setModi] = useState<Modi>('karibu');
  return (
    <>
      <div className="snil-modi-bar">
        <div className="snil-modi" role="tablist">
          {MODI_ORODHA.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={modi === m.id}
              className={modi === m.id ? 'hai' : ''}
              onClick={() => setModi(m.id)}
            >
              {m.lebo}
            </button>
          ))}
        </div>
      </div>
      {modi === 'karibu' ? (
        <Karibu
          onAnza={() => setModi('playground')}
          onJifunze={() => setModi('jifunze')}
        />
      ) : modi === 'playground' ? (
        <Playground />
      ) : modi === 'jifunze' ? (
        <Darasa />
      ) : (
        <Marejeo />
      )}
    </>
  );
}

function Playground() {
  const [code, setCode] = useState<string>(
    MIFANO.find((m) => m.id === 'hesabu')!.chanzo,
  );
  const [hai, setHai] = useState<string>('hesabu'); // mfano ulio hai
  const [output, setOutput] = useState<string>('');
  const [kosa, setKosa] = useState<SnilError | null>(null);
  const [python, setPython] = useState<string>('');
  const [pythonKosa, setPythonKosa] = useState<string>('');
  const [kichupo, setKichupo] = useState<Kichupo>('matokeo');
  const [imeendeshwa, setImeendeshwa] = useState<boolean>(false);

  // Idadi ya mistari kwa gutter ya mhariri.
  const mistari = useMemo(() => code.split('\n').length, [code]);

  function endesha() {
    setKichupo('matokeo');
    setImeendeshwa(true);
    try {
      const res = run(code, { uliza: (swali) => window.prompt(swali) ?? '' });
      setOutput(res.output);
      setKosa(res.error);
    } catch (e) {
      // run() haifai kutupa, lakini tunajilinda ikiwa stub bado inatupa.
      setOutput('');
      setKosa(asSnilError(e));
    }
  }

  function onyeshaPython() {
    setKichupo('python');
    try {
      setPython(toPython(code));
      setPythonKosa('');
    } catch (e) {
      setPython('');
      setPythonKosa(asSnilError(e).toString());
    }
  }

  function nadhifu() {
    try {
      setCode(formatSnil(code));
    } catch {
      // formatSnil haifai kushindwa; tunajilinda ili UI isianguke.
    }
  }

  function pakiaMfano(id: string) {
    const m = MIFANO.find((x) => x.id === id);
    if (!m) return;
    setCode(m.chanzo);
    setHai(id);
    setOutput('');
    setKosa(null);
    setPython('');
    setPythonKosa('');
    setImeendeshwa(false);
  }

  return (
    <div className="snil-app">
      <header className="snil-top">
        <div className="snil-brand">
          <span className="snil-mark" aria-hidden="true" />
          <div>
            <h1>SNIL</h1>
            <p>Lugha ya kompyuta ya Kiswahili</p>
          </div>
        </div>
        <div className="snil-actions">
          <button className="btn btn-run" onClick={endesha}>
            ▶ Endesha
          </button>
          <button className="btn btn-ghost" onClick={nadhifu}>
            Nadhifu
          </button>
          <button className="btn btn-ghost" onClick={onyeshaPython}>
            Onyesha Python
          </button>
        </div>
      </header>

      <div className="snil-body">
        <aside className="snil-side">
          <section>
            <h2>Mifano</h2>
            <ul className="mifano">
              {MIFANO.map((m) => (
                <li key={m.id}>
                  <button
                    className={'mfano' + (hai === m.id ? ' hai' : '')}
                    onClick={() => pakiaMfano(m.id)}
                  >
                    <span className="mfano-jina">{m.jina}</span>
                    <span className="mfano-maelezo">{m.maelezo}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Maneno-msingi</h2>
            <dl className="maneno">
              {MANENO_MSINGI.map((k) => (
                <div className="neno-row" key={k.neno}>
                  <dt>{k.neno}</dt>
                  <dd>{k.maana}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>

        <main className="snil-main">
          <section className="mhariri">
            <div className="mhariri-kichwa">andika.snil</div>
            <div className="mhariri-eneo">
              <div className="gutter" aria-hidden="true">
                {Array.from({ length: mistari }, (_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
              <textarea
                className="code"
                value={code}
                spellCheck={false}
                onChange={(e) => setCode(e.target.value)}
                aria-label="Mhariri wa SNIL"
              />
            </div>
          </section>

          <section className="paneli">
            <div className="paneli-vichupo">
              <button
                className={'kichupo' + (kichupo === 'matokeo' ? ' hai' : '')}
                onClick={() => setKichupo('matokeo')}
              >
                Matokeo
              </button>
              <button
                className={'kichupo' + (kichupo === 'python' ? ' hai' : '')}
                onClick={() => setKichupo('python')}
              >
                Python
              </button>
            </div>

            {kichupo === 'matokeo' ? (
              <div className="paneli-eneo">
                {kosa ? (
                  <pre className="kosa">{formatError(code, kosa)}</pre>
                ) : output ? (
                  <pre className="matokeo">{output}</pre>
                ) : (
                  <p className="tupu">
                    {imeendeshwa
                      ? 'Hakuna matokeo.'
                      : 'Bonyeza ▶ Endesha kuona matokeo.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="paneli-eneo">
                {pythonKosa ? (
                  <pre className="kosa">{pythonKosa}</pre>
                ) : python ? (
                  <pre className="python">{python}</pre>
                ) : (
                  <p className="tupu">
                    Bonyeza “Onyesha Python” kuona SNIL ikitafsiriwa Python.
                  </p>
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      <footer className="snil-chini">
        <span>SNIL · Laetoli</span>
        <span className="dot">·</span>
        <span>Imeandikwa kwa Kiswahili, inakimbia popote</span>
      </footer>
    </div>
  );
}

// Geuza chochote kuwa kitu chenye .toString() cha Kiswahili bila kutegemea stub.
function asSnilError(e: unknown): SnilError {
  if (e && typeof e === 'object' && 'toString' in e && 'line' in e) {
    return e as SnilError;
  }
  const msg = (e as Error)?.message ?? String(e);
  return { ujumbe: msg, line: 0, toString: () => msg } as unknown as SnilError;
}
