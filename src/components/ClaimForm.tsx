'use client';

import { useState, useEffect, useRef } from 'react';
import { ClaimResponse } from '@/lib/types';
import ScoreReveal from './ScoreReveal';
import { supabase } from '@/lib/supabase';

interface Props {
  coinExternalId: string;
  currentHolderName: string | null;
}

export default function ClaimForm({ coinExternalId, currentHolderName }: Props) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'earned' | 'stolen' | null>(null);
  const [storyText, setStoryText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showExtras, setShowExtras] = useState(true); // Open by default for launch
  const [isFirstTimer, setIsFirstTimer] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClaimResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Remember player name + detect first-timer
  useEffect(() => {
    const saved = localStorage.getItem('playerName');
    if (saved) {
      setName(saved);
    } else {
      setIsFirstTimer(true);
    }
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo must be under 10MB');
      return;
    }

    setPhotoFile(file);
    setError(null);

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${coinExternalId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('coin-photos')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from('coin-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Enter your name'); return; }
    if (!mode) { setError('Choose earned or stolen'); return; }

    setSubmitting(true);
    localStorage.setItem('playerName', name.trim());

    try {
      // Upload photo first if selected
      let photoUrl: string | undefined;
      if (photoFile) {
        setUploading(true);
        try {
          photoUrl = await uploadPhoto(photoFile);
        } catch (uploadErr) {
          setError('Photo upload failed — try again or remove the photo');
          setSubmitting(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coinExternalId,
          playerName: name.trim(),
          mode,
          storyText: storyText.trim() || undefined,
          photoUrl,
        }),
      });

      const data: ClaimResponse = await res.json();

      if (!data.ok) {
        setError(data.error || 'Something went wrong');
        setSubmitting(false);
        return;
      }

      setResult(data);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  // Show score reveal after successful claim
  if (result?.ok && result.score) {
    return (
      <div>
        <ScoreReveal
          score={result.score}
          playerName={result.playerName || name}
          seasonRank={result.seasonRank || 0}
          mode={mode!}
          previousHolderName={currentHolderName}
          newBadges={result.newBadges}
        />
        <button
          onClick={() => window.location.reload()}
          className="w-full mt-4 py-3 rounded-xl bg-[#1e3b2a] text-[#f7f3e6] font-bold text-sm hover:bg-[#254b37] transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  const buttonLabel = () => {
    if (uploading) return 'Uploading photo...';
    if (submitting) return 'Claiming...';
    return '🪙 Claim this coin';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-xs font-bold text-[#1e3b2a] mb-1">Your name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter your name"
          autoComplete="name"
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2f6f4f] focus:border-transparent"
          required
        />
      </div>

      {/* Mode toggle */}
      <div>
        <label className="block text-xs font-bold text-[#1e3b2a] mb-1">How&apos;d you get it?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('earned')}
            className={`py-2.5 rounded-lg border-2 font-bold text-sm transition-all ${
              mode === 'earned'
                ? 'border-[#2f6f4f] bg-[#2f6f4f] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            ✅ Earned
          </button>
          <button
            type="button"
            onClick={() => setMode('stolen')}
            className={`py-2.5 rounded-lg border-2 font-bold text-sm transition-all ${
              mode === 'stolen'
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            🗡️ Stolen
          </button>
        </div>
      </div>

      {/* Optional extras toggle */}
      <button
        type="button"
        onClick={() => setShowExtras(!showExtras)}
        className="text-xs text-[#2f6f4f] font-bold hover:underline"
      >
        {showExtras ? '▼ Hide extras' : '▶ Add story or photo (+bonus pts)'}
      </button>

      {showExtras && (
        <div className="space-y-3">
          {/* Story */}
          <div>
            <label htmlFor="story" className="block text-xs font-bold text-[#1e3b2a] mb-1">
              Your story <span className="font-normal text-gray-500">(+0.2 pts)</span>
            </label>
            <textarea
              id="story"
              value={storyText}
              onChange={e => setStoryText(e.target.value)}
              placeholder="How'd this go down?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#2f6f4f]"
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-xs font-bold text-[#1e3b2a] mb-1">
              Photo <span className="font-normal text-gray-500">(+0.2 pts)</span>
            </label>

            {!photoPreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-[#2f6f4f] hover:text-[#2f6f4f] transition-colors"
              >
                📸 Tap to add a photo
              </button>
            ) : (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full rounded-lg object-cover max-h-48 border border-gray-200"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* First-timer selfie nudge */}
      {isFirstTimer && (
        <div className="bg-[#f7f3e6] border border-[#c9c2ae] rounded-lg px-3 py-2.5 text-sm text-[#1e3b2a]">
          📸 <strong>First claim?</strong> Take a selfie with your coin! We need all agents accounted for in the photo album. Don&apos;t be the one missing!
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 font-medium bg-red-50 rounded-lg px-3 py-2 border border-red-200">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || uploading || !mode}
        className="w-full py-3 rounded-xl bg-[#1e3b2a] text-[#f7f3e6] font-extrabold text-base hover:bg-[#254b37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {buttonLabel()}
      </button>
    </form>
  );
}
