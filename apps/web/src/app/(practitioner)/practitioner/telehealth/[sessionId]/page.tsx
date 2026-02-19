'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { VideoRoom } from '@/components/telehealth/video-room';

export default function PractitionerTelehealthPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Virtual Consultation</h1>
      <VideoRoom sessionId={sessionId} role="practitioner" returnPath="/practitioner/dashboard" />
    </div>
  );
}
