'use client';

import React from 'react';
import { Phone } from 'lucide-react';

export function EmergencyCallBanner() {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-red-600" />
          <span className="font-semibold text-red-800">Emergency?</span>
        </div>
        <div className="flex gap-2">
          <a
            href="tel:992"
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            <Phone className="h-4 w-4" />
            Call 992
          </a>
          <a
            href="tel:112"
            className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
          >
            <Phone className="h-4 w-4" />
            Emergency 112
          </a>
        </div>
      </div>
    </div>
  );
}
