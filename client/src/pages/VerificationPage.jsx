import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const statusStyles = {
  pending: 'bg-yellow-50 text-amber-700',
  verified: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  unverified: 'bg-slate-50 text-slate-700',
};

const VerificationPage = () => {
  const [status, setStatus] = useState('pending');
  const [note, setNote] = useState('');
  const [docs, setDocs] = useState({ front: null, back: null });
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState({ front: '', back: '' });

  useEffect(() => {
    const load = async () => {
      const res = await api.get('/me/verification-status');
      setStatus(res.data.status);
      setNote(res.data.note || '');
      setPreviews({
        front: res.data.docs?.frontUrl || '',
        back: res.data.docs?.backUrl || '',
      });
    };
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (previews.front?.startsWith('blob:')) URL.revokeObjectURL(previews.front);
      if (previews.back?.startsWith('blob:')) URL.revokeObjectURL(previews.back);
    };
  }, [previews.front, previews.back]);

  const handleFileChange = (side) => (e) => {
    const file = e.target.files?.[0] || null;
    setDocs((d) => ({ ...d, [side]: file }));
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviews((p) => ({ ...p, [side]: previewUrl }));
    } else {
      setPreviews((p) => ({ ...p, [side]: '' }));
    }
  };

  const submitFiles = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (docs.front) formData.append('front', docs.front);
    if (docs.back) formData.append('back', docs.back);
    setUploading(true);
    try {
      const res = await api.post('/me/verification/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus(res.data.status);
      setNote(res.data.note || '');
      setPreviews((prev) => ({
        front: res.data.docs?.frontUrl || prev.front,
        back: res.data.docs?.backUrl || prev.back,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Profile Verification</h1>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          className={`rounded-lg px-3 py-3 text-sm font-semibold ${
            statusStyles[status] || 'bg-slate-50 text-slate-700'
          }`}
        >
          Status: {status.charAt(0).toUpperCase() + status.slice(1)}
          <div className="text-xs font-normal">
            {status === 'pending'
              ? 'Your documents are under review. This may take up to 24 hours.'
              : status === 'verified'
              ? 'You are verified.'
              : status === 'rejected'
              ? 'Please re-upload clearer documents.'
              : 'Upload documents to start verification.'}
          </div>
        </div>
        <form onSubmit={submitFiles} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">NID Front View</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange('front')}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">NID Back View / Student ID</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange('back')}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {(previews.front || previews.back) && (
            <div className="grid gap-4 md:grid-cols-2">
              {previews.front && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-700">Front Preview</div>
                  <img
                    src={previews.front}
                    alt="NID front preview"
                    className="mt-2 h-48 w-full rounded-md object-contain bg-white"
                  />
                </div>
              )}
              {previews.back && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-700">Back Preview</div>
                  <img
                    src={previews.back}
                    alt="NID back preview"
                    className="mt-2 h-48 w-full rounded-md object-contain bg-white"
                  />
                </div>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
        <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">Admin Feedback</div>
          <div className="mt-2">{note || 'No feedback yet.'}</div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;
