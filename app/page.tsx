"use client";
import { useState } from 'react';

type Provision = { article: string|null, clause: string|null, heading: string, summary: string, source: { title: string, url: string }, distance?: number };

type Structured = { summary: string, provisions: Provision[], sources: { title: string, url: string }[], labels: { summary: string, keyProvisions: string, sources: string, article: string } };

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [lang, setLang] = useState<'en'|'bn'>('en');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Structured| null>(null);
  const [error, setError] = useState<string>("");

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch('/api/query', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: question.trim(), lang }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Request failed');
      setData(json as Structured);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Bangladesh Constitution Q&A</h1>
      <form onSubmit={onAsk} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={lang === 'bn' ? 'প্রশ্ন লিখুন...' : 'Ask a question...'}
          style={{ flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: 6 }}
        />
        <select value={lang} onChange={(e) => setLang(e.target.value as 'en'|'bn')} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: 6 }}>
          <option value="en">EN</option>
          <option value="bn">BN</option>
        </select>
        <button type="submit" disabled={loading || !question.trim()} style={{ padding: '0.5rem 0.75rem', background: '#0ea5e9', color: 'white', borderRadius: 6, border: 'none' }}>
          {loading ? (lang === 'bn' ? 'লোড হচ্ছে...' : 'Loading...') : (lang === 'bn' ? 'জিজ্ঞাসা' : 'Ask')}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      {data && (
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>{data.labels.summary}</h2>
          <p style={{ marginBottom: '1rem' }}>{data.summary}</p>

          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{data.labels.keyProvisions}</h3>
          <ul style={{ marginBottom: '1rem', paddingLeft: '1rem' }}>
            {data.provisions.map((p, idx) => (
              <li key={idx} style={{ marginBottom: '0.5rem' }}>
                <div>
                  <strong>{data.labels.article} {p.article}{p.clause ? `(${p.clause})` : ''}{p.heading ? ` — ${p.heading}` : ''}:</strong> {p.summary}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  <a href={p.source.url} target="_blank" rel="noreferrer">{p.source.title}</a>
                  {typeof p.distance === 'number' ? ` • dist: ${p.distance.toFixed(3)}` : ''}
                </div>
              </li>
            ))}
          </ul>

          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{data.labels.sources}</h3>
          <ul style={{ paddingLeft: '1rem' }}>
            {data.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p style={{ fontSize: 12, color: '#64748b', marginTop: '1rem' }}>{lang === 'bn' ? 'উত্তর শুধুমাত্র প্রাপ্ত প্রসঙ্গ থেকে প্রস্তুত করা হয়।' : 'Answers are composed strictly from retrieved constitutional context.'}</p>
    </main>
  );
}
