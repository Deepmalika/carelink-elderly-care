import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Spinner from '../components/Spinner';
import { ErrorBanner } from '../components/Feedback';
import { formatCurrency, formatDuration } from '../lib/format';

const EXAMPLES = [
  'My mother just came home from hip surgery and needs help walking and recovering.',
  'Dad has diabetes and needs someone to check his blood sugar and give insulin.',
  'Grandma is lonely and just needs company and help with meals during the day.',
];

export default function Triage() {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    if (description.trim().length < 3) {
      setError('Please describe the situation in a bit more detail.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/triage', { description });
      setResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <span className="badge bg-amber-100 text-amber-600 mb-4 inline-block">AI-assisted · Beta</span>
      <h1 className="text-3xl font-extrabold mb-2">Not sure what care you need?</h1>
      <p className="text-muted mb-8 max-w-xl">
        Describe the situation in your own words, and our triage assistant will suggest which
        service category fits best. This is a matching aid, not a medical diagnosis — for any
        health decisions, please consult a doctor.
      </p>

      <form onSubmit={handleSubmit} className="card space-y-4 mb-4">
        <ErrorBanner message={error} />
        <textarea
          className="input min-h-[120px]"
          placeholder="e.g. My father was just discharged from the hospital after surgery and needs help recovering..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              key={ex}
              onClick={() => setDescription(ex)}
              className="text-xs badge border-2 border-pine-100 text-muted hover:border-pine-300"
            >
              {ex.length > 45 ? ex.slice(0, 45) + '...' : ex}
            </button>
          ))}
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Analyzing...' : 'Suggest a service'}
        </button>
      </form>

      {result && (
        <div className="space-y-6 animate-fade-up">
          <div className="card bg-pine-500 text-white border-none">
            <p className="text-pine-100 text-sm mb-1">Suggested category</p>
            <h2 className="text-2xl font-extrabold mb-2">{result.prediction.topLabel}</h2>
            <p className="text-pine-50 mb-3">{result.prediction.reason}</p>
            <p className="text-sm text-pine-100">
              Confidence: {(result.prediction.confidence * 100).toFixed(0)}%
            </p>
            {result.prediction.lowConfidence && (
              <p className="text-sm bg-white/15 rounded-lg px-3 py-2 mt-3">
                This one wasn't very clear-cut — feel free to browse all services manually too.
              </p>
            )}
          </div>

          <div>
            <h3 className="font-bold mb-3">How confident the assistant was, across all categories</h3>
            <div className="space-y-2">
              {result.prediction.allScores.map((s, i) => (
                <div key={s.category} className="flex items-center gap-3">
                  <span className="w-40 text-sm text-muted shrink-0">{s.label}</span>
                  <div className="flex-1 h-3 bg-pine-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pine-500 rounded-full transition-[width] duration-700 ease-out"
                      style={{ width: `${Math.max(s.confidence * 100, 2)}%`, transitionDelay: `${i * 80}ms` }}
                    />
                  </div>
                  <span className="w-12 text-sm text-right text-muted">{(s.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3">Matching services</h3>
            {result.matchingServices.length === 0 && (
              <p className="text-muted">No active services in this category right now.</p>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              {result.matchingServices.map((s) => (
                <div key={s.id} className="card card-hover">
                  <h4 className="font-bold mb-1">{s.name}</h4>
                  <p className="text-sm text-muted mb-3">{s.description}</p>
                  <p className="text-sm mb-4">
                    {formatCurrency(s.price)} · {formatDuration(s.duration_minutes)}
                  </p>
                  <Link to="/register?role=FAMILY" className="btn-secondary w-full">
                    Book this service
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
