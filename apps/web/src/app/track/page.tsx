'use client';

import React, { Suspense } from 'react';
import TrackClient from './TrackClient';

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-slate-400 text-xs font-black uppercase tracking-widest">
        Loading...
      </div>
    }>
      <TrackClient />
    </Suspense>
  );
}
