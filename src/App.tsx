// App.tsx — SNIL Playground. The friendliest way to write your first program in
// Kiswahili: edit, press Endesha, see output. Consumes only the public API from
// src/lang (parse/run/toPython); never reimplements the language.
import { useEffect, useMemo, useRef, useState } from 'react';
import { run, toPython, toJS, createReplSession } from './lang';
import type { SnilError } from './lang';
import { formatError } from './lang/diagnose';
import { formatSnil } from './lang/format';
import { Darasa } from './Darasa';
import { Karibu } from './Karibu';
import { Marejeo } from './Marejeo';

type Modi = 'karibu' | 'playground' | 'jaribio' | 'jifunze' | 'marejeo';

const MODI_ORODHA: { id: Modi; lebo: string }[] = [
  { id: 'karibu', lebo: 'Karibu' },
  { id: 'playground', lebo: 'Playground' },
  { id: 'jaribio', lebo: 'Jaribio' },
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

type Kichupo = 'matokeo' | 'python' | 'js';

// --- Workspace ya faili nyingi (multi-file) ---
type Faili = { name: string; code: string };
const HIFADHI_KEY = 'snil:workspace';

// main.snil ya awali — inaonyesha `leta` ikileta moduli `salamu`.
const MAIN_AWALI = `# Karibu SNIL! Hii ni faili kuu (main.snil).
# Tunaleta moduli "salamu" kisha tunatumia kazi yake.
leta "salamu"

onyesha karibisha("Asha")
onyesha karibisha("Juma")
`;

const SALAMU_AWALI = `# salamu.snil — moduli ndogo. Faili nyingine zinaweza kuileta kwa: leta "salamu"
kazi karibisha(jina)
    rudisha "Karibu " + jina
mwisho
`;

function failiAwali(): Faili[] {
  return [
    { name: 'main.snil', code: MAIN_AWALI },
    { name: 'salamu.snil', code: SALAMU_AWALI },
  ];
}

// Pakua workspace kutoka localStorage; rudisha awali ikiwa haipo / imeharibika.
function pakuaWorkspace(): Faili[] {
  try {
    const raw = localStorage.getItem(HIFADHI_KEY);
    if (!raw) return failiAwali();
    const data = JSON.parse(raw);
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      data.every(
        (f) =>
          f && typeof f.name === 'string' && typeof f.code === 'string',
      )
    ) {
      return data as Faili[];
    }
  } catch {
    // hifadhi imeharibika — tunarudi kwenye awali kwa usalama
  }
  return failiAwali();
}

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
      ) : modi === 'jaribio' ? (
        <Jaribio />
      ) : modi === 'jifunze' ? (
        <Darasa />
      ) : (
        <Marejeo />
      )}
    </>
  );
}

// --- Jaribio (REPL) — andika mstari, ona jibu papo hapo, hali inadumu ---
type JaribioKipele =
  | { aina: 'amri'; maandishi: string }                 // kile ulichoandika (echo)
  | { aina: 'matokeo'; maandishi: string }              // onyesha output
  | { aina: 'thamani'; maandishi: string }              // jibu la usemi mmoja
  | { aina: 'kosa'; maandishi: string }                 // kosa la Kiswahili
  | { aina: 'dokezo'; maandishi: string };              // mwongozo wa kuanzia

const JARIBIO_DOKEZO =
  'Andika SNIL hapa, mfano: onyesha "Habari" — kisha bonyeza Enter.';

function Jaribio() {
  // Kipindi kimoja kinachodumu kwa maisha ya kipengele hiki.
  const sessionRef = useRef(createReplSession());
  const [historia, setHistoria] = useState<JaribioKipele[]>([
    { aina: 'dokezo', maandishi: JARIBIO_DOKEZO },
  ]);
  const [mstari, setMstari] = useState<string>('');
  const eneoRef = useRef<HTMLDivElement | null>(null);
  const ingizoRef = useRef<HTMLTextAreaElement | null>(null);

  // Sogeza chini kila historia inapoongezeka.
  useEffect(() => {
    const el = eneoRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [historia]);

  function tumia() {
    const src = mstari.replace(/\s+$/, '');
    if (src.trim() === '') return;
    const res = sessionRef.current.eval(src, {
      uliza: (swali) => window.prompt(swali) ?? '',
    });
    const ongeza: JaribioKipele[] = [{ aina: 'amri', maandishi: src }];
    if (res.output) ongeza.push({ aina: 'matokeo', maandishi: res.output });
    if (res.error) {
      ongeza.push({ aina: 'kosa', maandishi: res.error.toString() });
    } else if (res.value !== undefined) {
      ongeza.push({ aina: 'thamani', maandishi: res.value });
    }
    setHistoria((prev) => [...prev, ...ongeza]);
    setMstari('');
  }

  function futa() {
    sessionRef.current = createReplSession();
    setHistoria([{ aina: 'dokezo', maandishi: JARIBIO_DOKEZO }]);
    setMstari('');
    ingizoRef.current?.focus();
  }

  function bonyeza(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter inatuma; Shift+Enter inaweka mstari mpya.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      tumia();
    }
  }

  return (
    <div className="snil-app">
      <header className="snil-top">
        <div className="snil-brand">
          <span className="snil-mark" aria-hidden="true" />
          <div>
            <h1>Jaribio</h1>
            <p>Andika mstari mmoja, ona jibu papo hapo</p>
          </div>
        </div>
        <div className="snil-actions">
          <button className="btn btn-ghost" onClick={futa}>
            Futa
          </button>
        </div>
      </header>

      <div className="repl">
        <div className="repl-eneo" ref={eneoRef} aria-live="polite">
          {historia.map((k, i) => {
            if (k.aina === 'dokezo') {
              return (
                <p className="repl-dokezo" key={i}>
                  {k.maandishi}
                </p>
              );
            }
            if (k.aina === 'amri') {
              return (
                <pre className="repl-amri" key={i}>
                  <span className="repl-prompt" aria-hidden="true">›</span>
                  {k.maandishi}
                </pre>
              );
            }
            if (k.aina === 'kosa') {
              return (
                <pre className="repl-kosa" key={i}>
                  {k.maandishi}
                </pre>
              );
            }
            return (
              <pre
                className={k.aina === 'thamani' ? 'repl-thamani' : 'repl-matokeo'}
                key={i}
              >
                {k.maandishi}
              </pre>
            );
          })}
        </div>
        <div className="repl-ingizo">
          <span className="repl-prompt" aria-hidden="true">›</span>
          <textarea
            ref={ingizoRef}
            className="repl-code"
            value={mstari}
            spellCheck={false}
            rows={1}
            autoFocus
            placeholder='onyesha "Habari"'
            onChange={(e) => setMstari(e.target.value)}
            onKeyDown={bonyeza}
            aria-label="Andika SNIL"
          />
        </div>
      </div>

      <footer className="snil-chini">
        <span>SNIL · Jaribio</span>
        <span className="dot">·</span>
        <span>Enter kutuma · Shift+Enter mstari mpya</span>
      </footer>
    </div>
  );
}

function Playground() {
  const [faili, setFaili] = useState<Faili[]>(pakuaWorkspace);
  const [haiFaili, setHaiFaili] = useState<number>(0);
  const [hariri, setHariri] = useState<number | null>(null); // index inayohaririwa jina
  const [hai, setHai] = useState<string>(''); // mfano ulio hai (sidebar)
  const [output, setOutput] = useState<string>('');
  const [kosa, setKosa] = useState<SnilError | null>(null);
  const [python, setPython] = useState<string>('');
  const [pythonKosa, setPythonKosa] = useState<string>('');
  const [js, setJs] = useState<string>('');
  const [jsKosa, setJsKosa] = useState<string>('');
  const [kichupo, setKichupo] = useState<Kichupo>('matokeo');
  const [imeendeshwa, setImeendeshwa] = useState<boolean>(false);

  // Faili iliyo hai sasa (kinga: kama index imepita mpaka, rudi 0).
  const idx = haiFaili < faili.length ? haiFaili : 0;
  const code = faili[idx]?.code ?? '';

  // Hifadhi workspace kila inapobadilika.
  useEffect(() => {
    try {
      localStorage.setItem(HIFADHI_KEY, JSON.stringify(faili));
    } catch {
      // hifadhi imejaa / haipatikani — tunaendelea bila kuvunja UI
    }
  }, [faili]);

  // Idadi ya mistari kwa gutter ya mhariri.
  const mistari = useMemo(() => code.split('\n').length, [code]);

  // Resolver: leta "salamu" → tafuta faili "salamu" au "salamu.snil".
  const somaModuli = useMemo(() => {
    return (name: string): string | null => {
      const f =
        faili.find((x) => x.name === name) ??
        faili.find((x) => x.name === name + '.snil');
      return f ? f.code : null;
    };
  }, [faili]);

  function setCode(mpya: string) {
    setFaili((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, code: mpya } : f)),
    );
  }

  function endesha() {
    setKichupo('matokeo');
    setImeendeshwa(true);
    try {
      const res = run(code, {
        uliza: (swali) => window.prompt(swali) ?? '',
        somaModuli,
      });
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
      setPython(toPython(code, somaModuli));
      setPythonKosa('');
    } catch (e) {
      setPython('');
      setPythonKosa(asSnilError(e).toString());
    }
  }

  function onyeshaJS() {
    setKichupo('js');
    try {
      setJs(toJS(code, somaModuli));
      setJsKosa('');
    } catch (e) {
      setJs('');
      setJsKosa(asSnilError(e).toString());
    }
  }

  function nadhifu() {
    try {
      setCode(formatSnil(code));
    } catch {
      // formatSnil haifai kushindwa; tunajilinda ili UI isianguke.
    }
  }

  function safishaMatokeo() {
    setOutput('');
    setKosa(null);
    setPython('');
    setPythonKosa('');
    setJs('');
    setJsKosa('');
    setImeendeshwa(false);
  }

  function ongezaFaili() {
    const jina = (window.prompt('Jina la faili?', '.snil') ?? '').trim();
    if (!jina) return;
    if (faili.some((f) => f.name === jina)) {
      window.alert('Faili lenye jina hilo lipo tayari.');
      return;
    }
    setFaili((prev) => [...prev, { name: jina, code: '' }]);
    setHaiFaili(faili.length);
    safishaMatokeo();
  }

  function badiliJina(i: number, jina: string) {
    const mpya = jina.trim();
    setHariri(null);
    if (!mpya || mpya === faili[i].name) return;
    if (faili.some((f, j) => j !== i && f.name === mpya)) {
      window.alert('Faili lenye jina hilo lipo tayari.');
      return;
    }
    setFaili((prev) => prev.map((f, j) => (j === i ? { ...f, name: mpya } : f)));
  }

  function futaFaili(i: number) {
    if (faili.length <= 1) return; // weka angalau faili moja
    if (!window.confirm(`Futa "${faili[i].name}"?`)) return;
    setFaili((prev) => prev.filter((_, j) => j !== i));
    setHaiFaili((cur) => {
      const next = cur > i ? cur - 1 : cur;
      return next >= faili.length - 1 ? Math.max(0, faili.length - 2) : next;
    });
    safishaMatokeo();
  }

  function pakiaMfano(id: string) {
    const m = MIFANO.find((x) => x.id === id);
    if (!m) return;
    // Pakia mfano kwenye faili iliyo hai.
    setCode(m.chanzo);
    setHai(id);
    safishaMatokeo();
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
          <button className="btn btn-ghost" onClick={onyeshaJS}>
            Onyesha JS
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
            <div className="faili-bar" role="tablist" aria-label="Faili">
              {faili.map((f, i) => (
                <div
                  key={i}
                  className={'faili-tab' + (i === idx ? ' hai' : '')}
                >
                  {hariri === i ? (
                    <input
                      className="faili-jina-hariri"
                      defaultValue={f.name}
                      autoFocus
                      spellCheck={false}
                      onBlur={(e) => badiliJina(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') setHariri(null);
                      }}
                    />
                  ) : (
                    <button
                      className="faili-jina"
                      role="tab"
                      aria-selected={i === idx}
                      onClick={() => {
                        setHaiFaili(i);
                        safishaMatokeo();
                      }}
                      onDoubleClick={() => setHariri(i)}
                      title={f.name}
                    >
                      {f.name}
                    </button>
                  )}
                  {hariri !== i && (
                    <button
                      className="faili-ic"
                      title="Badili jina"
                      aria-label={'Badili jina la ' + f.name}
                      onClick={() => setHariri(i)}
                    >
                      ✎
                    </button>
                  )}
                  {faili.length > 1 && hariri !== i && (
                    <button
                      className="faili-ic faili-futa"
                      title="Futa faili"
                      aria-label={'Futa ' + f.name}
                      onClick={() => futaFaili(i)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                className="faili-ongeza"
                onClick={ongezaFaili}
                title="Ongeza faili jipya"
              >
                + Faili
              </button>
            </div>
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
              <button
                className={'kichupo' + (kichupo === 'js' ? ' hai' : '')}
                onClick={() => setKichupo('js')}
              >
                JavaScript
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
            ) : kichupo === 'python' ? (
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
            ) : (
              <div className="paneli-eneo">
                {jsKosa ? (
                  <pre className="kosa">{jsKosa}</pre>
                ) : js ? (
                  <pre className="python">{js}</pre>
                ) : (
                  <p className="tupu">
                    Bonyeza “Onyesha JS” kuona SNIL ikitafsiriwa JavaScript.
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
