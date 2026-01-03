'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const CallCenterContainer = dynamic(
  () => import('../containers/CallCenterContainer').then((m) => m.CallCenterContainer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white text-xl">
        Loading...
      </div>
    ),
  },
);

export default function CallCenterClientLoader() {
  return <CallCenterContainer />;
}
