'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Plus, Trash2, GripVertical, ChevronLeft } from 'lucide-react';

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
      <div className="max-w-2xl mx-auto space-y-6 fade-in">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-[#191c1e] tracking-tight font-sans">Create Trade Assessment</h2>
            <p className="text-xs text-[#565e74]">Define trade category, language, and evaluation questions</p>
          </div>
          <button
            onClick={() => router.push('/tests')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e1e0ff] text-[#191c1e] hover:text-[#4648d4] text-xs font-bold transition-colors"
          >
            <ChevronLeft size={14} /> Back to Tests
          </button>
        </div>

        {/* Test Details Card */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#191c1e] mb-4">Test Details</h2>
          {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-[#565e74] mb-1.5">Trade</label>
              <select value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs focus:outline-none focus:border-[#4648d4]">
                {TRADES.map(t => <option key={t} value={t} className="bg-white text-[#191c1e]">{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#565e74] mb-1.5">Language</label>
              <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs focus:outline-none focus:border-[#4648d4]">
                {LANGUAGES.map(l => <option key={l} value={l} className="bg-white text-[#191c1e]">{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#565e74] mb-1.5">Test Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Electrician Safety Fundamentals"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] focus:bg-white transition-colors" />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-white border border-[#e0e3e5] rounded-xl p-5 shadow-sm fade-in">
              <div className="flex items-start gap-3">
                <GripVertical size={16} className="text-[#767586] mt-1 cursor-grab flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#4648d4]">Question {qi + 1}</span>
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(qi)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#767586] hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <input
                    value={q.question}
                    onChange={e => updateQuestion(qi, 'question', e.target.value)}
                    placeholder="Enter question text..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] mb-3"
                  />
                  <div className="space-y-2 mb-3">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correctAnswer === opt && opt !== ''}
                          onChange={() => opt && updateQuestion(qi, 'correctAnswer', opt)}
                          className="accent-[#4648d4] w-4 h-4 flex-shrink-0"
                          title="Mark as correct answer"
                        />
                        <input
                          value={opt}
                          onChange={e => {
                            updateOption(qi, oi, e.target.value);
                            if (q.correctAnswer === opt) updateQuestion(qi, 'correctAnswer', e.target.value);
                          }}
                          placeholder={`Option ${oi + 1}`}
                          className="flex-1 px-3 py-2 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4]"
                        />
                        {q.correctAnswer === opt && opt && (
                          <span className="text-[11px] font-bold text-[#059669] flex-shrink-0">✓ Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#767586]">Select the radio button next to the correct answer.</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={addQuestion}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white hover:bg-[#e1e0ff]/30 text-[#4648d4] text-xs font-bold transition-colors border border-[#4648d4]/30 border-dashed shadow-sm">
            <Plus size={14} /> Add Question
          </button>
          <button
            id="save-test-btn"
            onClick={handleSubmit}
            disabled={createTest.isPending}
            className="flex-1 py-3 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm">
            {createTest.isPending ? 'Saving...' : '✓ Save Test'}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
