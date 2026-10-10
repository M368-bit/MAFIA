import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface VoiceChatProps {
  socket: Socket;
  roomData: any;
}

export default function VoiceChat({ socket, roomData }: VoiceChatProps) {
  const [isMuted, setIsMuted] = useState(true);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [peerId: string]: RTCPeerConnection }>({});
  const audioElementsRef = useRef<{ [peerId: string]: HTMLAudioElement }>({});

  const me = socket.id ? roomData.players[socket.id] : null;
  const isAlive = me?.isAlive;

  const ICE_SERVERS = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  useEffect(() => {
    socket.on('webrtc_offer', async ({ senderId, offer }) => {
      try {
        if (!isAlive) return; // Dead players do not process audio streams!
        const pc = createPeerConnection(senderId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { targetId: senderId, answer });
      } catch (err) {
        console.error('Error WebRTC offer', err);
      }
    });

    socket.on('webrtc_answer', async ({ senderId, answer }) => {
      try {
        const pc = peersRef.current[senderId];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('Error WebRTC answer', err);
      }
    });

    socket.on('webrtc_ice_candidate', async ({ senderId, candidate }) => {
      try {
        const pc = peersRef.current[senderId];
        if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error ICE candidate', err);
      }
    });

    return () => {
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      stopAudio();
    };
  }, [socket, isAlive]);

  // Turn off mic immediately if player dies mid-game
  useEffect(() => {
    if (!isAlive && !isMuted) {
      stopAudio();
    }
  }, [isAlive]);

  const createPeerConnection = (targetId: string) => {
    if (peersRef.current[targetId]) return peersRef.current[targetId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_ice_candidate', { targetId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      let audioEl = audioElementsRef.current[targetId];
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioElementsRef.current[targetId] = audioEl;
      }
      audioEl.srcObject = event.streams[0];
    };

    return pc;
  };

  const toggleMic = async () => {
    if (!isAlive) {
      alert('اللاعب الميت لا يمكنه استخدام المحادثة الصوتية!');
      return;
    }

    if (isMuted) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        setIsMuted(false);

        Object.keys(roomData.players).forEach(async (playerId) => {
          if (playerId !== socket.id && roomData.players[playerId].isConnected && roomData.players[playerId].isAlive) {
            const pc = createPeerConnection(playerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc_offer', { targetId: playerId, offer });
          }
        });
      } catch (err) {
        alert('تعذر الوصول إلى الميكروفون. يرجى السماح بالإذن من إعدادات المتصفح.');
      }
    } else {
      stopAudio();
    }
  };

  const stopAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setIsMuted(true);
  };

  return (
    <div className="glass-card p-4 rounded-3xl flex items-center justify-between shadow-xl border border-white/10">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-md ${!isMuted ? 'bg-green-600/20 border border-green-500/60 text-green-400 animate-pulse' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
          {!isMuted ? <Volume2 className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="font-bold text-sm">المحادثة الصوتية (المايك)</h4>
          <span className="text-xs text-gray-400">
            {!isAlive
              ? 'المايك مغلق للجمهور والأموات 💀'
              : !isMuted
              ? 'أنت تتحدث الآن مع اللاعبين'
              : 'الميكروفون مغلق (اضغط للتفعيل)'}
          </span>
        </div>
      </div>

      <button
        onClick={toggleMic}
        disabled={!isAlive}
        className={`px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-sm transition-all border backdrop-blur-md ${
          !isAlive
            ? 'opacity-40 cursor-not-allowed bg-gray-800 border-gray-700 text-gray-500'
            : !isMuted
            ? 'bg-red-600 hover:bg-red-500 border-red-500 text-white shadow-lg glow-red'
            : 'bg-accentPurple hover:bg-purple-600 border-purple-400/40 text-white shadow-lg glow-purple'
        }`}
      >
        {!isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        <span>{!isMuted ? 'إغلاق المايك' : 'فتح المايك'}</span>
      </button>
    </div>
  );
}
