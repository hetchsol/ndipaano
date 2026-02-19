'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { telehealthAPI } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useTelehealth } from '@/hooks/use-telehealth';
import { SessionControls } from './session-controls';
import { WaitingRoom } from './waiting-room';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { User, Wifi, WifiOff } from 'lucide-react';

interface VideoRoomProps {
  sessionId: string;
  role: 'patient' | 'practitioner';
  returnPath: string;
}

export function VideoRoom({ sessionId, role, returnPath }: VideoRoomProps) {
  const router = useRouter();
  const { user } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [isCallActive, setIsCallActive] = useState(false);
  const [endNotes, setEndNotes] = useState('');
  const [showEndSummary, setShowEndSummary] = useState(false);

  const isPatient = role === 'patient';

  // Fetch session data
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await telehealthAPI.getSession(sessionId);
        setSession(res.data.data || res.data);
      } catch {
        toast.error('Failed to load session');
      } finally {
        setIsLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  // Timer
  useEffect(() => {
    if (!isCallActive || !session?.startedAt) return;
    const startTime = new Date(session.startedAt).getTime();
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const mins = Math.floor(diff / 60).toString().padStart(2, '0');
      const secs = (diff % 60).toString().padStart(2, '0');
      setElapsedTime(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCallActive, session?.startedAt]);

  // WebRTC signal handler
  const handleSignal = useCallback(async (data: { type: string; payload: any; fromUserId: string }) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (data.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal('answer', answer, data.fromUserId);
      } else if (data.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
      } else if (data.type === 'ice-candidate' && data.payload) {
        await pc.addIceCandidate(new RTCIceCandidate(data.payload));
      }
    } catch (err) {
      console.error('WebRTC signal error:', err);
    }
  }, []);

  const handleStatusChanged = useCallback((data: { sessionId: string; status: string }) => {
    setSession((prev: any) => prev ? { ...prev, status: data.status } : prev);
    if (data.status === 'ACTIVE') {
      setIsCallActive(true);
      initializeWebRTC();
    } else if (data.status === 'ENDED') {
      setIsCallActive(false);
      setShowEndSummary(true);
      cleanupMedia();
    }
  }, []);

  const { isConnected, sendSignal } = useTelehealth({
    sessionId,
    onSignal: handleSignal,
    onSessionStatusChanged: handleStatusChanged,
  });

  // Initialize WebRTC
  async function initializeWebRTC() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && session?.booking) {
          const targetId = isPatient ? session.booking.practitionerId : session.booking.patientId;
          sendSignal('ice-candidate', event.candidate, targetId);
        }
      };

      // Practitioner creates offer
      if (!isPatient) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const targetId = session?.booking?.patientId;
        if (targetId) {
          sendSignal('offer', offer, targetId);
        }
      }
    } catch (err) {
      toast.error('Failed to access camera/microphone');
      console.error('Media error:', err);
    }
  }

  function cleanupMedia() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
  }

  // Actions
  async function handleGrantConsent() {
    try {
      await telehealthAPI.recordConsent(sessionId, { recordingConsent: true });
      setSession((prev: any) => prev ? { ...prev, recordingConsent: true } : prev);
      toast.success('Consent granted');
    } catch {
      toast.error('Failed to record consent');
    }
  }

  async function handleStartSession() {
    try {
      const res = await telehealthAPI.startSession(sessionId);
      const updated = res.data.data || res.data;
      setSession(updated);
      setIsCallActive(true);
      initializeWebRTC();
    } catch {
      toast.error('Failed to start session');
    }
  }

  async function handleEndCall() {
    try {
      await telehealthAPI.endSession(sessionId, endNotes ? { practitionerNotes: endNotes } : undefined);
      setIsCallActive(false);
      setShowEndSummary(true);
      cleanupMedia();
    } catch {
      toast.error('Failed to end session');
    }
  }

  function handleToggleMute() {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }

  function handleToggleVideo() {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  }

  function handleToggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500">Session not found</p>
        <Button onClick={() => router.push(returnPath)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  // Show end summary
  if (showEndSummary || session.status === 'ENDED') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <User className="h-8 w-8 text-green-700" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Session Ended</h2>
            <p className="mt-2 text-sm text-gray-500">
              Duration: {session.durationMinutes ? `${session.durationMinutes} minutes` : elapsedTime}
            </p>
            {!isPatient && (
              <div className="mt-4">
                <label className="block text-left text-sm font-medium text-gray-700">Session Notes</label>
                <textarea
                  value={endNotes}
                  onChange={(e) => setEndNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                  placeholder="Add session notes..."
                />
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={async () => {
                    try {
                      await telehealthAPI.endSession(sessionId, { practitionerNotes: endNotes });
                      toast.success('Notes saved');
                    } catch { toast.error('Failed to save notes'); }
                  }}
                >
                  Save Notes
                </Button>
              </div>
            )}
            <Button className="mt-6 w-full" onClick={() => router.push(returnPath)}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show waiting room if session is WAITING
  if (session.status === 'WAITING' && !isCallActive) {
    return (
      <WaitingRoom
        isPatient={isPatient}
        sessionStatus={session.status}
        patientConsent={session.recordingConsent}
        patientName={session.booking?.patient ? `${session.booking.patient.firstName} ${session.booking.patient.lastName}` : undefined}
        practitionerName={session.booking?.practitioner ? `${session.booking.practitioner.firstName} ${session.booking.practitioner.lastName}` : undefined}
        onGrantConsent={handleGrantConsent}
        onReady={() => {}}
        onStartSession={handleStartSession}
      />
    );
  }

  // Active call UI
  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Connection indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1">
        {isConnected ? (
          <><Wifi className="h-3 w-3 text-green-400" /><span className="text-xs text-green-400">Connected</span></>
        ) : (
          <><WifiOff className="h-3 w-3 text-red-400" /><span className="text-xs text-red-400">Disconnected</span></>
        )}
      </div>

      {/* Video panels */}
      <div className="relative w-full max-w-4xl aspect-video rounded-xl bg-gray-900 overflow-hidden">
        {/* Remote video (large) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
        {/* Placeholder when no remote video */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-700">
            <User className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        {/* Local video (small overlay) */}
        <div className="absolute bottom-4 right-4 h-32 w-44 overflow-hidden rounded-lg border-2 border-white shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Controls */}
      <SessionControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isFullscreen={isFullscreen}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onEndCall={handleEndCall}
        onToggleFullscreen={handleToggleFullscreen}
        elapsedTime={elapsedTime}
      />
    </div>
  );
}
