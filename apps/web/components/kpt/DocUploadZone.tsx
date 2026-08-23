'use client';
import { useState, useCallback } from 'react';

type VerifyStatus =
  | 'not_uploaded'
  | 'uploading'
  | 'verifying'
  | 'verified'
  | 'failed'
  | 'manual_review';

interface DocUploadZoneProps {
  docType: string;
  label: string;
  verifyApi: string;
  acceptedFormats: string;
  maxSizeMb: number;
  crn: string;
  onVerified?: (docType: string) => void;
  onFailed?: (docType: string, reason: string) => void;
}

interface UploadResponse {
  signedUrl: string;
  documentId: string;
}

interface VerifyResponse {
  status: string;
  message?: string;
}

export function DocUploadZone({
  docType,
  label,
  verifyApi,
  acceptedFormats,
  maxSizeMb,
  crn,
  onVerified,
  onFailed,
}: DocUploadZoneProps) {
  const [status, setStatus] = useState<VerifyStatus>('not_uploaded');
  const [fileName, setFileName] = useState<string | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMb * 1024 * 1024) {
        setFailReason(`File exceeds ${maxSizeMb}MB limit`);
        setStatus('failed');
        return;
      }

      setFileName(file.name);
      setStatus('uploading');

      try {
        // Step 1: Get signed URL
        const uploadRes = await fetch('/api/partner/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crn, stage: 3, docType, fileName: file.name }),
          credentials: 'include',
        });

        if (!uploadRes.ok) throw new Error('Failed to get upload URL');

        const { signedUrl, documentId } = (await uploadRes.json()) as UploadResponse;

        // Step 2: Upload directly to Supabase Storage via signed URL
        const putRes = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!putRes.ok) throw new Error('Failed to upload file to storage');

        setStatus('verifying');

        // Step 3: Trigger verification
        const verifyRes = await fetch(`/api/partner/verify/${docType}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crn, documentId }),
          credentials: 'include',
        });

        if (!verifyRes.ok) throw new Error('Verification request failed');

        const verifyData = (await verifyRes.json()) as VerifyResponse;

        if (verifyData.status === 'verified') {
          setStatus('verified');
          onVerified?.(docType);
        } else if (verifyData.status === 'manual_review') {
          setStatus('manual_review');
        } else {
          const reason = verifyData.message ?? 'Verification failed';
          setStatus('failed');
          setFailReason(reason);
          onFailed?.(docType, reason);
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Upload failed';
        setStatus('failed');
        setFailReason(reason);
        onFailed?.(docType, reason);
      }
    },
    [crn, docType, maxSizeMb, onVerified, onFailed],
  );

  const handleReset = () => {
    setStatus('not_uploaded');
    setFileName(null);
    setFailReason(null);
  };

  const acceptAttr = acceptedFormats
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((f) => `.${f.toLowerCase()}`)
    .join(',');

  return (
    <div
      className={`bg-white border rounded-[8px] p-5 transition-all ${
        isDragging ? 'border-[#2563EB] bg-[rgba(37,99,235,0.08)]' : 'border-[#E8E8E6]'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <svg
          className="w-8 h-8 text-[#6B6B6B] shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#2D2D2D]">{label}</p>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mt-0.5">
            Verify via: {verifyApi}
          </p>
        </div>

        {/* Status indicator top-right */}
        <div className="shrink-0 ml-auto">
          {status === 'verified' && (
            <span className="w-6 h-6 rounded-full bg-[#065F46] flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
          )}
          {(status === 'uploading' || status === 'verifying') && (
            <div className="w-6 h-6 rounded-full border-2 border-[#F59E0B] border-t-transparent animate-spin" />
          )}
          {status === 'failed' && (
            <span className="w-6 h-6 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-[12px] font-bold">
              ✕
            </span>
          )}
          {status === 'manual_review' && (
            <span className="w-6 h-6 rounded-full bg-[#1E40AF] flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Upload zone (shown only when not yet uploaded) */}
      {status === 'not_uploaded' && (
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#E8E8E6] rounded-[6px] cursor-pointer hover:border-[#2563EB] hover:bg-[rgba(37,99,235,0.06)] transition-all">
          <svg
            className="w-6 h-6 text-[#6B6B6B] mb-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
          <span className="text-[12px] text-[#6B6B6B]">Click to upload or drag &amp; drop</span>
          <input
            type="file"
            className="hidden"
            accept={acceptAttr}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      )}

      {/* File status row (shown after upload starts) */}
      {status !== 'not_uploaded' && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-[6px] text-[13px] ${
            status === 'verified'
              ? 'bg-[#ECFDF5] text-[#065F46]'
              : status === 'failed'
              ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB]'
              : status === 'manual_review'
              ? 'bg-[#EFF6FF] text-[#1E40AF]'
              : 'bg-[#FFFBEB] text-[#92400E]'
          }`}
        >
          <span className="truncate">{fileName}</span>
          <span className="ml-auto text-[11px] shrink-0 font-medium">
            {status === 'uploading'
              ? 'Uploading...'
              : status === 'verifying'
              ? 'Verifying...'
              : status === 'verified'
              ? 'Verified ✓'
              : status === 'manual_review'
              ? 'Manual review'
              : 'Verification failed'}
          </span>
        </div>
      )}

      {/* Failure row */}
      {status === 'failed' && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[12px] text-[#2563EB] truncate">{failReason}</p>
          <button
            onClick={handleReset}
            className="shrink-0 text-[12px] text-[#2563EB] border border-[#2563EB] px-2 py-0.5 rounded-[4px] hover:bg-[rgba(37,99,235,0.08)] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Manual review note */}
      {status === 'manual_review' && (
        <p className="mt-2 text-[12px] text-[#1E40AF]">
          This document requires manual review by our team. We will notify you within 1–2 business days.
        </p>
      )}

      <p className="text-[11px] text-[#6B6B6B] mt-2">
        Accepted: {acceptedFormats} · Max {maxSizeMb}MB
      </p>
    </div>
  );
}
