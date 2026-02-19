'use client';

import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, Minimize } from 'lucide-react';
import { Button } from '../ui/button';

interface SessionControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onToggleFullscreen: () => void;
  elapsedTime: string;
}

export function SessionControls({
  isMuted, isVideoOff, isFullscreen,
  onToggleMute, onToggleVideo, onEndCall, onToggleFullscreen,
  elapsedTime,
}: SessionControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 rounded-xl bg-gray-900/90 px-6 py-3 backdrop-blur">
      <span className="mr-4 text-sm font-mono text-white">{elapsedTime}</span>
      <button
        onClick={onToggleMute}
        className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
          isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
        }`}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      <button
        onClick={onToggleVideo}
        className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
          isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
        }`}
      >
        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </button>
      <button
        onClick={onEndCall}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
      <button
        onClick={onToggleFullscreen}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
      >
        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      </button>
    </div>
  );
}
