// App.tsx — SNIL Playground. The friendliest way to write your first program in
// Kiswahili: edit, press Endesha, see output. Consumes only the public API from
// src/lang (parse/run/toPython); never reimplements the language.
import { useMemo, useState } from 'react';
import { run, toPython } from './lang';
import type { SnilError } from './lang';

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
                  <pre className="kosa">{kosa.toString()}</pre>
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
