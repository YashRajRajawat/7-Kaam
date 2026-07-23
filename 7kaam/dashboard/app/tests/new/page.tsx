'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Plus, Trash2, GripVertical } from 'lucide-react';

const TRADES = ['ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN', 'PAINTER', 'WELDER'];
const LANGUAGES = ['ENGLISH', 'HINDI', 'KANNADA', 'TAMIL'];

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

const BLANK_Q: Question = { question: '', options: ['', '', '', ''], correctAnswer: '' };

export default function NewTestPage() {
  const router = useRouter();
  const [form, setForm] = useState({ trade: 'ELECTRICIAN', language: 'ENGLISH', title: '' });
  const [questions, setQuestions] = useState<Question[]>([{ ...BLANK_Q }]);
  const [error, setError] = useState('');

  const createTest = useMutation({
    mutationFn: (payload: { trade: string; language: string; title: string; questions: Question[] }) =>
      api.post('/tests', payload),
    onSuccess: () => router.push('/tests'),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to create test');
    },
  });

  function addQuestion() {
    setQuestions(qs => [...qs, { ...BLANK_Q, options: ['', '', '', ''] }]);
  }

  function removeQuestion(i: number) {
    setQuestions(qs => qs.filter((_, idx) => idx !== i));
  }

  function updateQuestion(i: number, field: keyof Question, value: string | string[]) {
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  }

  function updateOption(qi: number, oi: number, val: string) {
    setQuestions(qs => qs.map((q, idx) => {
      if (idx !== qi) return q;
      const oldVal = q.options[oi];
      const opts = [...q.options];
      opts[oi] = val;
      const isSelected = q.correctAnswer === oldVal || (!q.correctAnswer && oi === 0);
      return { ...q, options: opts, correctAnswer: isSelected ? val : q.correctAnswer };
    }));
  }

  function handleSubmit() {
    setError('');
    if (!form.title) { setError('Test title required'); return; }
    const cleanedQuestions = questions.map(q => ({
      ...q,
      options: q.options.filter(o => o.trim() !== ''),
    }));
    if (cleanedQuestions.some(q => !q.question || !q.correctAnswer || q.options.length < 2)) {
      setError('All questions must have a question, at least 2 options, and a correct answer'); return;
    }
    createTest.mutate({ ...form, questions: cleanedQuestions });
  }

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-6 mb-4">
          <h2 className="text-base font-bold text-white mb-4">Test Details</h2>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1">Trade</label>
              <select value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#0F6E56] appearance-none">
                {TRADES.map(t => <option key={t} value={t} className="bg-[#111827]">{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1">Language</label>
              <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#0F6E56] appearance-none">
                {LANGUAGES.map(l => <option key={l} value={l} className="bg-[#111827]">{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#94a3b8] mb-1">Test Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Electrician Safety Fundamentals"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#0F6E56] transition-colors" />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 mb-4">
          {questions.map((q, qi) => (
            <div key={qi} className="glass-card p-5 fade-in">
              <div className="flex items-start gap-3">
                <GripVertical size={16} className="text-[#374151] mt-0.5 cursor-grab flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#0F6E56]">Question {qi + 1}</span>
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(qi)} className="text-[#4b5563] hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <input
                    value={q.question}
                    onChange={e => updateQuestion(qi, 'question', e.target.value)}
                    placeholder="Enter question text..."
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#0F6E56] mb-3"
                  />
                  <div className="space-y-2 mb-3">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correctAnswer === opt && opt !== ''}
                          onChange={() => opt && updateQuestion(qi, 'correctAnswer', opt)}
                          className="accent-[#0F6E56] flex-shrink-0"
                          title="Mark as correct answer"
                        />
                        <input
                          value={opt}
                          onChange={e => {
                            updateOption(qi, oi, e.target.value);
                            if (q.correctAnswer === opt) updateQuestion(qi, 'correctAnswer', e.target.value);
                          }}
                          placeholder={`Option ${oi + 1}`}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-[#4b5563] focus:outline-none focus:border-[#0F6E56]"
                        />
                        {q.correctAnswer === opt && opt && (
                          <span className="text-[10px] text-[#4ade80] flex-shrink-0">✓ Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#4b5563]">Select the radio button next to the correct answer.</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={addQuestion}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors border border-white/10 border-dashed">
            <Plus size={14} /> Add Question
          </button>
          <button
            id="save-test-btn"
            onClick={handleSubmit}
            disabled={createTest.isPending}
            className="flex-1 py-2.5 rounded-lg bg-[#0F6E56] hover:bg-[#1a9070] disabled:opacity-50 text-white text-sm font-semibold transition-all">
            {createTest.isPending ? 'Saving...' : '✓ Save Test'}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
