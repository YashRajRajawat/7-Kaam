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
      <div className="max-w-xl mx-auto space-y-6 fade-in">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-[#191c1e] tracking-tight">Onboard New Worker</h2>
            <p className="text-xs text-[#565e74]">Add worker credentials and initial profile details</p>
          </div>
          <button
            onClick={() => router.push('/workers')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e1e0ff] text-[#191c1e] hover:text-[#4648d4] text-xs font-bold transition-colors"
          >
            <ChevronLeft size={14} /> Back to Directory
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between bg-white border border-[#e0e3e5] rounded-xl p-4 shadow-sm">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                i < step ? 'bg-[#4648d4] text-white' :
                i === step ? 'bg-[#e1e0ff] text-[#4648d4] border border-[#4648d4]' :
                'bg-[#f2f4f6] text-[#767586] border border-[#e0e3e5]'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`ml-2 text-xs font-bold ${i === step ? 'text-[#191c1e]' : 'text-[#767586]'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`mx-3 h-0.5 w-8 sm:w-12 ${i < step ? 'bg-[#4648d4]' : 'bg-[#e0e3e5]'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>
          )}

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-base font-bold text-[#191c1e] mb-4">Personal Information</h3>
              {[
                { label: 'Full Name *', key: 'fullName', placeholder: 'e.g. Ravi Kumar', type: 'text' },
                { label: 'Phone Number *', key: 'phoneNumber', placeholder: '+91 98765 43210', type: 'tel' },
                { label: 'City *', key: 'city', placeholder: 'e.g. Bangalore', type: 'text' },
                { label: 'Locality', key: 'locality', placeholder: 'e.g. Indiranagar', type: 'text' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-[#565e74] mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form] as string}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] focus:bg-white transition-colors"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-[#565e74] mb-1.5">Trade *</label>
                <select
                  value={form.trade}
                  onChange={e => setForm(f => ({ ...f, trade: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs focus:outline-none focus:border-[#4648d4] focus:bg-white transition-colors"
                >
                  {TRADES.map(t => <option key={t} value={t} className="bg-white text-[#191c1e]">{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-base font-bold text-[#191c1e] mb-4">Identity Verification</h3>
              <div>
                <label className="block text-xs font-bold text-[#565e74] mb-1.5">Aadhaar Number *</label>
                <input
                  type="text"
                  value={form.aadhaar}
                  onChange={e => setForm(f => ({ ...f, aadhaar: formatAadhaar(e.target.value) }))}
                  placeholder="XXXX XXXX XXXX"
                  maxLength={14}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] focus:bg-white transition-colors font-mono tracking-widest"
                />
                <p className="text-[11px] text-[#767586] mt-1.5">Aadhaar is hashed before storage — never stored in plain text.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none pt-2">
                <input
                  type="checkbox"
                  checked={form.aadhaarVerified}
                  onChange={e => setForm(f => ({ ...f, aadhaarVerified: e.target.checked }))}
                  className="w-4 h-4 rounded border-[#e0e3e5] accent-[#4648d4]"
                />
                <span className="text-xs text-[#565e74] font-medium">Mark Aadhaar as verified (admin reviewed document)</span>
              </label>
            </div>
          )}

          {/* Step 2: Photo */}
          {step === 2 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-base font-bold text-[#191c1e] mb-4">Profile Photo</h3>
              <div
                className="border-2 border-dashed border-[#e0e3e5] rounded-xl p-8 text-center cursor-pointer hover:border-[#4648d4] bg-[#f8f9fa] hover:bg-[#e1e0ff]/20 transition-colors"
                onClick={() => document.getElementById('photo-input')?.click()}
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover mx-auto shadow-sm border-2 border-white" />
                ) : (
                  <>
                    <Upload size={32} className="text-[#4648d4] mx-auto mb-2" />
                    <p className="text-xs font-bold text-[#191c1e]">Click to upload profile photo</p>
                    <p className="text-[11px] text-[#767586] mt-1">JPG, PNG up to 5MB</p>
                  </>
                )}
              </div>
              <input id="photo-input" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <p className="text-xs text-[#767586] text-center">Photo is optional but improves worker profile.</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t border-[#e0e3e5]">
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e1e0ff] text-[#191c1e] hover:text-[#4648d4] text-xs font-bold transition-colors">
                <ChevronLeft size={14} /> Back
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button onClick={nextStep} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white text-xs font-bold transition-all shadow-sm">
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                id="submit-worker-btn"
                onClick={() => createWorker.mutate()}
                disabled={createWorker.isPending}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm"
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
