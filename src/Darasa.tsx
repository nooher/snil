// Darasa.tsx — DARASA learn-mode for SNIL. An interactive "jifunze kuandika programu
// kwa Kiswahili" experience: a lesson list with completion ticks + progress, an
// active-lesson view (editor + run/check), and a certificate (Cheti) when all
// lessons are complete. Consumes COURSE (course.ts) + checkLesson (check.ts);
// both may be stubs landing in parallel, so every cross-module call is guarded.
import { useEffect, useMemo, useState } from 'react';
import { run } from './lang';
import type { SnilError } from './lang';
import { formatError } from './lang/diagnose';
import { COURSE } from './darasa/course';
import { checkLesson } from './darasa/check';
import type { CheckResult, Lesson } from './darasa/types';
import {
  someaZilizokamilika,
  hifadhiZilizokamilika,
  loadProgress,
  markComplete,
  issueCertificate,
} from './darasa/cloud';

// Geuza chochote kuwa SnilError-kama bila kutegemea stub.
function asSnilError(e: unknown): SnilError {
  if (e && typeof e === 'object' && 'toString' in e && 'line' in e) {
    return e as SnilError;
  }
  const msg = (e as Error)?.message ?? String(e);
  return { ujumbe: msg, line: 0, toString: () => msg } as unknown as SnilError;
}

export function Darasa() {
  const masomo = COURSE?.masomo ?? [];
  const [kamilika, setKamilika] = useState<Set<string>>(() => someaZilizokamilika());
  const [haiId, setHaiId] = useState<string>(() => masomo[0]?.id ?? '');
  const [code, setCode] = useState<string>(() => masomo[0]?.anzia ?? '');
  const [output, setOutput] = useState<string>('');
  const [kosa, setKosa] = useState<SnilError | null>(null);
  const [matokeoKagua, setMatokeoKagua] = useState<CheckResult | null>(null);
  const [imeendeshwa, setImeendeshwa] = useState<boolean>(false);
  const [chetiHai, setChetiHai] = useState<boolean>(false);
  const [jina, setJina] = useState<string>('');

  const somo = useMemo<Lesson | undefined>(
    () => masomo.find((m) => m.id === haiId),
    [masomo, haiId],
  );

  const idxHai = useMemo(() => masomo.findIndex((m) => m.id === haiId), [masomo, haiId]);
  const zoteZimekamilika = masomo.length > 0 && masomo.every((m) => kamilika.has(m.id));
  const idadiKamilika = masomo.filter((m) => kamilika.has(m.id)).length;
  const mistari = useMemo(() => code.split('\n').length, [code]);

  useEffect(() => {
    hifadhiZilizokamilika(kamilika);
  }, [kamilika]);

  // On mount: local state already renders instantly; reconcile with cloud
  // (merged with local) if a backend is configured. Fully guarded — offline
  // this is a no-op beyond re-reading localStorage.
  useEffect(() => {
    let alive = true;
    loadProgress()
      .then((merged) => {
        if (!alive) return;
        setKamilika((prev) => {
          // Only update if cloud added anything new, to avoid a needless render.
          if (merged.size === prev.size && [...merged].every((id) => prev.has(id))) {
            return prev;
          }
          const next = new Set(prev);
          merged.forEach((id) => next.add(id));
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  function chaguaSomo(id: string) {
    const m = masomo.find((x) => x.id === id);
    if (!m) return;
    setChetiHai(false);
    setHaiId(id);
    setCode(m.anzia);
    setOutput('');
    setKosa(null);
    setMatokeoKagua(null);
    setImeendeshwa(false);
  }

  function endeshaNaKagua() {
    if (!somo) return;
    setImeendeshwa(true);
    setMatokeoKagua(null);
    let runError: SnilError | null = null;
    try {
      const res = run(code, { uliza: (swali) => window.prompt(swali) ?? '' });
      setOutput(res.output);
      setKosa(res.error);
      runError = res.error;
    } catch (e) {
      setOutput('');
      runError = asSnilError(e);
      setKosa(runError);
    }

    // Kagua dhidi ya ukaguzi wa somo (checkLesson inaweza bado kuwa stub).
    let res: CheckResult;
    try {
      res = checkLesson(somo, code);
    } catch {
      res = {
        passed: false,
        ujumbe: runError
          ? 'Programu yako ina hitilafu — tazama matokeo hapa chini.'
          : 'Mkaguzi haujapatikana bado. Jaribu tena baadaye.',
      };
    }
    setMatokeoKagua(res);

    if (res.passed) {
      setKamilika((prev) => {
        if (prev.has(somo.id)) return prev;
        const nxt = new Set(prev);
        nxt.add(somo.id);
        return nxt;
      });
      // Persist to local + cloud (guarded; offline writes localStorage only).
      void markComplete(somo.id);
    }
  }

  function onyeshaJibu() {
    if (!somo) return;
    if (!window.confirm('Una uhakika? Hii itaweka jibu kamili kwenye mhariri.')) return;
    setCode(somo.suluhisho);
    setOutput('');
    setKosa(null);
    setMatokeoKagua(null);
    setImeendeshwa(false);
  }

  function anzaUpya() {
    if (!somo) return;
    setCode(somo.anzia);
    setOutput('');
    setKosa(null);
    setMatokeoKagua(null);
    setImeendeshwa(false);
  }

  function somoLinalofuata() {
    const nxt = masomo[idxHai + 1];
    if (nxt) {
      chaguaSomo(nxt.id);
    } else if (zoteZimekamilika) {
      setChetiHai(true);
    }
  }

  // ---- Empty / not-yet-built state ----------------------------------------
  if (masomo.length === 0) {
    return (
      <div className="darasa">
        <div className="darasa-tupu">
          <span className="darasa-mark" aria-hidden="true" />
          <h2>{COURSE?.kichwa || 'Jifunze SNIL'}</h2>
          <p>Masomo yanaandaliwa. Tafadhali rudi hivi karibuni.</p>
        </div>
      </div>
    );
  }

  const ujao = masomo[idxHai + 1];

  return (
    <div className="darasa">
      <aside className="darasa-side">
        <div className="darasa-utangulizi">
          <h2>{COURSE.kichwa || 'Jifunze SNIL'}</h2>
          {COURSE.utangulizi ? <p>{COURSE.utangulizi}</p> : null}
        </div>

        <div className="darasa-maendeleo">
          <div className="darasa-pau">
            <span
              className="darasa-pau-fill"
              style={{ width: `${(idadiKamilika / masomo.length) * 100}%` }}
            />
          </div>
          <span className="darasa-maendeleo-lebo">
            Somo {Math.max(idxHai + 1, 1)}/{masomo.length} · {idadiKamilika} kamili
          </span>
        </div>

        <ol className="darasa-orodha">
          {masomo.map((m, i) => {
            const done = kamilika.has(m.id);
            const hai = !chetiHai && m.id === haiId;
            return (
              <li key={m.id}>
                <button
                  className={'darasa-somo' + (hai ? ' hai' : '') + (done ? ' done' : '')}
                  onClick={() => chaguaSomo(m.id)}
                >
                  <span className="darasa-tiki" aria-hidden="true">
                    {done ? '✓' : i + 1}
                  </span>
                  <span className="darasa-somo-kichwa">{m.kichwa}</span>
                </button>
              </li>
            );
          })}
          {zoteZimekamilika ? (
            <li>
              <button
                className={'darasa-somo darasa-cheti-link' + (chetiHai ? ' hai' : '')}
                onClick={() => setChetiHai(true)}
              >
                <span className="darasa-tiki" aria-hidden="true">★</span>
                <span className="darasa-somo-kichwa">Cheti</span>
              </button>
            </li>
          ) : null}
        </ol>
      </aside>

      <main className="darasa-main">
        {chetiHai ? (
          <Cheti
            kichwa={COURSE.kichwa || 'Jifunze SNIL'}
            jina={jina}
            setJina={setJina}
            idadi={masomo.length}
          />
        ) : somo ? (
          <>
            <div className="darasa-somo-kichwa-kuu">
              <h1>{somo.kichwa}</h1>
              {somo.maelezo
                .split('\n')
                .map((mstari, i) => (mstari.trim() === '' ? <br key={i} /> : <p key={i}>{mstari}</p>))}
              <div className="darasa-lengo">
                <span className="darasa-lengo-lebo">Lengo</span>
                <span>{somo.lengo}</span>
              </div>
            </div>

            <section className="mhariri darasa-mhariri">
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
                  aria-label="Mhariri wa somo"
                />
              </div>
            </section>

            <div className="darasa-vitendo">
              <button className="btn btn-run" onClick={endeshaNaKagua}>
                ▶ Endesha &amp; Kagua
              </button>
              <button className="btn btn-line" onClick={onyeshaJibu}>
                Onyesha jibu
              </button>
              <button className="btn btn-line" onClick={anzaUpya}>
                Anza upya
              </button>
            </div>

            {matokeoKagua ? (
              <div className={'darasa-tokeo ' + (matokeoKagua.passed ? 'sawa' : 'kosa')}>
                <span className="darasa-tokeo-ikoni" aria-hidden="true">
                  {matokeoKagua.passed ? '✓' : '✗'}
                </span>
                <div className="darasa-tokeo-maandishi">
                  <p>{matokeoKagua.ujumbe}</p>
                  {matokeoKagua.passed ? (
                    ujao ? (
                      <button className="btn btn-run btn-ndogo" onClick={somoLinalofuata}>
                        Somo linalofuata →
                      </button>
                    ) : (
                      <button className="btn btn-run btn-ndogo" onClick={() => setChetiHai(true)}>
                        Pata Cheti ★
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            ) : null}

            <section className="paneli darasa-paneli">
              <div className="paneli-vichupo">
                <span className="kichupo hai">Matokeo</span>
              </div>
              <div className="paneli-eneo">
                {kosa ? (
                  <pre className="kosa">{formatError(code, kosa)}</pre>
                ) : output ? (
                  <pre className="matokeo">{output}</pre>
                ) : (
                  <p className="tupu">
                    {imeendeshwa
                      ? 'Hakuna matokeo.'
                      : 'Bonyeza ▶ Endesha & Kagua kuona matokeo.'}
                  </p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

// ---- Cheti (certificate) --------------------------------------------------
function Cheti({
  kichwa,
  jina,
  setJina,
  idadi,
}: {
  kichwa: string;
  jina: string;
  setJina: (s: string) => void;
  idadi: number;
}) {
  const leo = new Date().toLocaleDateString('sw-TZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Verification code ("cheti namba") — minted when the learner confirms their
  // name. issueCertificate is offline-safe: it always returns a code (cloud row
  // when a backend is on, otherwise a locally-minted one).
  const [code, setCode] = useState<string>('');
  const [inatoa, setInatoa] = useState<boolean>(false);

  async function pataCheti() {
    if (!jina.trim() || inatoa) return;
    setInatoa(true);
    try {
      const res = await issueCertificate(jina);
      setCode(res.code);
    } catch {
      // issueCertificate never throws, but stay defensive.
    } finally {
      setInatoa(false);
    }
  }

  return (
    <div className="cheti-eneo">
      <div className="cheti">
        <span className="cheti-mihuri" aria-hidden="true">★</span>
        <p className="cheti-juu">CHETI CHA UKAMILIFU</p>
        <h1 className="cheti-kichwa">{kichwa}</h1>
        <p className="cheti-maelezo">Hongera! Umekamilisha masomo yote {idadi}.</p>
        <p className="cheti-tunza">Cheti hiki kinatolewa kwa:</p>
        <input
          className="cheti-jina-ingizo"
          value={jina}
          placeholder="Andika jina lako"
          onChange={(e) => {
            setJina(e.target.value);
            setCode(''); // jina likibadilika, namba ya zamani haitumiki
          }}
          aria-label="Jina la mwanafunzi"
        />
        <div className="cheti-jina-onyesho">{jina.trim() || '— jina lako —'}</div>
        <p className="cheti-maandishi">
          umejifunza kuandika programu kwa Kiswahili kwa kutumia SNIL — vigeu, masharti,
          vitanzi, na kazi. Endelea kuunda!
        </p>
        {code ? (
          <div className="cheti-namba" aria-live="polite">
            Cheti namba: <strong>{code}</strong>
          </div>
        ) : (
          <button
            className="btn btn-run btn-ndogo cheti-toa"
            onClick={pataCheti}
            disabled={!jina.trim() || inatoa}
          >
            {inatoa ? 'Inatolewa…' : 'Toa cheti & pata namba'}
          </button>
        )}
        <div className="cheti-chini">
          <span>{leo}</span>
          <span className="cheti-saini">SNIL · Laetoli</span>
        </div>
      </div>
    </div>
  );
}
