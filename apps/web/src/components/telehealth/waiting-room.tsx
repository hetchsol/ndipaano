'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Video, Shield, Loader2 } from 'lucide-react';

interface WaitingRoomProps {
  isPatient: boolean;
  sessionStatus: string;
  patientConsent: boolean;
  patientName?: string;
  practitionerName?: string;
  onGrantConsent: () => void;
  onReady: () => void;
  onStartSession: () => void;
  isLoading?: boolean;
}

export function WaitingRoom({
  isPatient, sessionStatus, patientConsent,
  patientName, practitionerName,
  onGrantConsent, onReady, onStartSession, isLoading,
}: WaitingRoomProps) {
  const [consentChecked, setConsentChecked] = useState(false);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Video className="h-8 w-8 text-green-700" />
          </div>
          <CardTitle>Virtual Consultation</CardTitle>
          <p className="text-sm text-gray-500">
            {isPatient
              ? `Waiting for ${practitionerName || 'your practitioner'} to start the session`
              : `Waiting for ${patientName || 'the patient'} to join`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-center gap-2">
            <Badge className={
              sessionStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
              sessionStatus === 'WAITING' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }>
              {sessionStatus === 'WAITING' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {sessionStatus}
            </Badge>
          </div>

          {/* Patient consent */}
          {isPatient && !patientConsent && (
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-green-700" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Recording Consent</p>
                  <p className="mt-1 text-xs text-gray-500">
                    This session may be recorded for quality and medical record purposes.
                  </p>
                  <label className="mt-3 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-green-700 focus:ring-green-700"
                    />
                    <span className="text-sm text-gray-700">I consent to recording</span>
                  </label>
                  <Button
                    size="sm"
                    className="mt-3"
                    disabled={!consentChecked}
                    onClick={onGrantConsent}
                  >
                    Grant Consent
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Patient ready button */}
          {isPatient && patientConsent && sessionStatus === 'WAITING' && (
            <Button className="w-full" onClick={onReady} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              I&apos;m Ready
            </Button>
          )}

          {/* Practitioner start button */}
          {!isPatient && sessionStatus === 'WAITING' && (
            <div className="space-y-3">
              <div className="text-center text-sm text-gray-500">
                Patient consent: {patientConsent ? (
                  <Badge className="bg-green-100 text-green-800 ml-1">Granted</Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800 ml-1">Pending</Badge>
                )}
              </div>
              <Button className="w-full" onClick={onStartSession} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Start Session
              </Button>
            </div>
          )}

          {sessionStatus === 'ACTIVE' && (
            <p className="text-center text-sm text-green-700 font-medium">
              Session is active — connecting...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
