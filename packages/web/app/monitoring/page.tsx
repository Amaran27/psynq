'use client';

import { useEffect } from 'react';

export default function MonitoringPage() {
  useEffect(() => {
    // Optional: Add any client-side logic if needed
  }, []);

  return (
    <div className="w-full h-screen">
      <iframe
        src="http://localhost:3001/monitoring"
        className="w-full h-full border-0"
        title="Grafana Dashboard"
      />
    </div>
  );
}