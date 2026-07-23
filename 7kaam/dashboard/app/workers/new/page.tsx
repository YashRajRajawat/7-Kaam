'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ChevronLeft, ChevronRight, Check, Upload } from 'lucide-react';
import { hashAadhaar } from './hashUtils';

const TRADES = ['ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN', 'PAINTER', 'WELDER'];

const STEPS = ['Personal Info', 'Identity', 'Photo'];

export default function NewWorkerPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    fullName: '', phoneNumber: '', trade: 'ELECTRICIAN', city: '', locality: '',
    aadhaar: '', aadhaarVerified: false,
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  const createWorker = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('fullName', form.fullName);
      fd.append('phoneNumber', form.phoneNumber);
      fd.append('trade', form.trade);
      fd.append('city', form.city);
      fd.append('locality', form.locality);
      fd.append('aadhaar', form.aadhaar);
      fd.append('aadhaarVerified', String(form.aadhaarVerified));
      if (photo) fd.append('profilePhoto', photo);
      return api.post('/workers', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => router.push(`/workers/${res.data.id}`),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to create worker');
    },
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setPhoto(f);
      setPhotoPreview(URL.createObjectURL(f));
    }
  }

  function nextStep() {
    setError('');
    if (step === 0) {
      if (!form.fullName || !form.phoneNumber || !form.city) {
        setError('Please fill all required fields'); return;
      }
    }
    if (step === 1) {
      if (!form.aadhaar || form.aadhaar.replace(/\s/g, '').length !== 12) {
        setError('Enter a valid 12-digit Aadhaar number'); return;
      }
    }
    setStep(s => s + 1);
  }

  function formatAadhaar(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  return (
    <DashboardShell>
      <div className="max-w-xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
                i < step ? 'bg-[#0F6E56] text-white' :
                i === step ? 'bg-[#0F6E56]/20 text-[#4ade80] border border-[#0F6E56]' :
                'bg-white/5 text-[#4b5563]'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`ml-2 text-xs font-medium ${i === step ? 'text-white' : 'text-[#4b5563]'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`mx-4 flex-1 h-px w-12 ${i < step ? 'bg-[#0F6E56]' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="glass-card p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
          )}

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-base font-bold text-white mb-4">Personal Information</h3>
              {[
                { label: 'Full Name *', key: 'fullName', placeholder: 'e.g. Ravi Kumar', type: 'text' },
                { label: 'Phone Number *', key: 'phoneNumber', placeholder: '+91 98765 43210', type: 'tel' },
                { label: 'City *', key: 'city', placeholder: 'e.g. Bangalore', type: 'text' },
                { label: 'Locality', key: 'locality', placeholder: 'e.g. Indiranagar', type: 'text' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[#94a3b8] mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form] as string}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#0F6E56] transition-colors"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1">Trade *</label>
                <select
                  value={form.trade}
                  onChange={e => setForm(f => ({ ...f, trade: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#0F6E56] transition-colors appearance-none"
                >
                  {TRADES.map(t => <option key={t} value={t} className="bg-[#111827]">{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-base font-bold text-white mb-4">Identity Verification</h3>
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1">Aadhaar Number *</label>
                <input
                  type="text"
                  value={form.aadhaar}
                  onChange={e => setForm(f => ({ ...f, aadhaar: formatAadhaar(e.target.value) }))}
                  placeholder="XXXX XXXX XXXX"
                  maxLength={14}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#0F6E56] transition-colors font-mono tracking-widest"
                />
                <p className="text-[10px] text-[#4b5563] mt-1">Aadhaar is hashed before storage — never stored in plain text.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.aadhaarVerified}
                  onChange={e => setForm(f => ({ ...f, aadhaarVerified: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#0F6E56]"
                />
                <span className="text-sm text-[#94a3b8]">Mark Aadhaar as verified (admin reviewed document)</span>
              </label>
            </div>
          )}

          {/* Step 2: Photo */}
          {step === 2 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-base font-bold text-white mb-4">Profile Photo</h3>
              <div
                className="border-2 border-dashed border-white/15 rounded-xl p-8 text-center cursor-pointer hover:border-[#0F6E56]/50 transition-colors"
                onClick={() => document.getElementById('photo-input')?.click()}
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover mx-auto" />
                ) : (
                  <>
                    <Upload size={32} className="text-[#4b5563] mx-auto mb-2" />
                    <p className="text-sm text-[#6b7280]">Click to upload profile photo</p>
                    <p className="text-xs text-[#4b5563] mt-1">JPG, PNG up to 5MB</p>
                  </>
                )}
              </div>
              <input id="photo-input" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <p className="text-xs text-[#4b5563] text-center">Photo is optional but improves worker profile.</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t border-white/5">
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors">
                <ChevronLeft size={14} /> Back
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button onClick={nextStep} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F6E56] hover:bg-[#1a9070] text-white text-sm font-semibold transition-all">
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                id="submit-worker-btn"
                onClick={() => createWorker.mutate()}
                disabled={createWorker.isPending}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#0F6E56] hover:bg-[#1a9070] disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {createWorker.isPending ? 'Creating...' : '✓ Create Worker'}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
