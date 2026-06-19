// Karibu.tsx — SNIL landing/home view. Kiswahili-first front door to the language:
// a warm hero with the SNIL mark + tagline + two CTAs, a "kwa nini SNIL?" value
// section, a live (non-editable) code teaser with its output, and a footer.
// CTAs switch app mode via callbacks from App. Pure presentation — no language imports.
import type { ReactNode } from 'react';

type Props = {
  onAnza: () => void; // → Playground
  onJifunze: () => void; // → Jifunze / DARASA
};

// --- "kwa nini SNIL?" — value cards (solid fills, inline-SVG icons) ---
const SABABU: { ikoni: ReactNode; kichwa: string; maelezo: string }[] = [
  {
    kichwa: 'Kiswahili kwanza',
    maelezo:
      'Maneno-msingi yote ni ya Kiswahili: onyesha, weka, ikiwa, kwa kila. Andika programu kwa lugha yako.',
    ikoni: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 5h16M4 5v12a2 2 0 0 0 2 2h7M9 5v8m3-8c0 4 2 7 6 8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    kichwa: 'Inafundishika',
    maelezo:
      'Sarufi safi na fupi, ujumbe wa hitilafu kwa Kiswahili. Imejengwa kwa mwanafunzi wa kwanza kabisa.',
    ikoni: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 4 2 9l10 5 10-5-10-5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M6 11v5c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    kichwa: 'Inafanya kazi kweli',
    maelezo:
      'Programu zako zinakimbia papo hapo na zinaweza ku-compile kwenda Python halali. Si mchezo — ni lugha kamili.',
    ikoni: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m8 8 4 4-4 4M13 16h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    kichwa: 'Huria na huru',
    maelezo:
      'SNIL ni lugha huria (open-source), bila vizuizi na bila malipo. Ni mali ya wote wanaoizungumza Kiswahili.',
    ikoni: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3a4 4 0 0 0-4 4v3m12 0v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="15" r="1.4" fill="currentColor" />
      </svg>
    ),
  },
];

// --- live teaser: a tiny SNIL program + its exact output ---
const TEASER_CODE = `# Programu yako ya kwanza
onyesha "Habari, dunia!"

weka jina kuwa "Asha"
onyesha "Karibu " + jina`;

const TEASER_OUT = `Habari, dunia!
Karibu Asha`;

export function Karibu({ onAnza, onJifunze }: Props) {
  return (
    <div className="karibu">
      {/* ---------- Hero ---------- */}
      <section className="karibu-hero">
        <span className="karibu-mark" aria-hidden="true" />
        <h1 className="karibu-jina">SNIL</h1>
        <p className="karibu-tagline">Lugha ya kompyuta ya Kiswahili</p>
        <p className="karibu-pitch">
          Andika programu kwa lugha yako. Bila vizuizi.
        </p>
        <div className="karibu-cta">
          <button className="btn btn-run karibu-btn" onClick={onAnza}>
            Anza Kuandika
          </button>
          <button className="btn btn-line karibu-btn" onClick={onJifunze}>
            Jifunze
          </button>
        </div>
      </section>

      {/* ---------- Kwa nini SNIL? ---------- */}
      <section className="karibu-sehemu">
        <h2 className="karibu-h2">Kwa nini SNIL?</h2>
        <div className="karibu-kadi-grid">
          {SABABU.map((s) => (
            <article className="karibu-kadi" key={s.kichwa}>
              <span className="karibu-kadi-ikoni" aria-hidden="true">
                {s.ikoni}
              </span>
              <h3>{s.kichwa}</h3>
              <p>{s.maelezo}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- Live teaser ---------- */}
      <section className="karibu-sehemu">
        <h2 className="karibu-h2">SNIL inaonekanaje?</h2>
        <p className="karibu-sehemu-maelezo">
          Hivi ndivyo programu rahisi inavyoonekana — na matokeo yake.
        </p>
        <div className="karibu-teaser">
          <div className="karibu-teaser-paneli">
            <div className="karibu-teaser-kichwa">andika.snil</div>
            <pre className="karibu-teaser-code">{TEASER_CODE}</pre>
          </div>
          <div className="karibu-teaser-paneli">
            <div className="karibu-teaser-kichwa">Matokeo</div>
            <pre className="karibu-teaser-code karibu-teaser-out">
              {TEASER_OUT}
            </pre>
          </div>
        </div>
        <div className="karibu-teaser-cta">
          <button className="btn btn-run karibu-btn" onClick={onAnza}>
            Jaribu sasa →
          </button>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="karibu-chini">
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
