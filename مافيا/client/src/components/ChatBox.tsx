import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { MessageSquare, Send, ShieldAlert, Skull, Smile, Music } from 'lucide-react';

interface ChatMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  senderId: string;
  senderRole: string | null;
  message: string;
  channel: string;
  time: string;
}

interface ChatBoxProps {
  socket: Socket;
  myRole: string | null;
  isAlive: boolean;
}

const STICKERS = ['🤫', '🔪', '🕵️‍♂️', '💉', '🤡', '💀', '💥', '🔥', '👑', '🦊', '❤️', '👍'];

const AUDIO_MEMES_MASRY = [
  { id: 'faaaaa', label: '😮‍💨 فااااااااا', emoji: '😮‍💨' },
  { id: 'kafr_elsheikh', label: '🔥 كفر الشيخ رقم واحد', emoji: '🔥' },
  { id: 'no_biskota', label: '🍪 نوو بسكوته نووو', emoji: '🍪' },
  { id: 'oh_helwa', label: '😏 اوه حلوه يا ولد ثبتني', emoji: '😏' },
  { id: 'zeheqt', label: '🤦‍♂️ لا انا زهقت الصراحه', emoji: '🤦‍♂️' },
  { id: 'seyah', label: '📢 صياااااح', emoji: '📢' },
  { id: 'ana_hamoot', label: '💀 انا همووووت', emoji: '💀' },
];

export default function ChatBox({ socket, myRole, isAlive }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [channel, setChannel] = useState<'general' | 'mafia' | 'dead'>('general');
  const [showStickers, setShowStickers] = useState(false);
  const [showMemes, setShowMemes] = useState(false);
  const [memeCooldown, setMemeCooldown] = useState(0);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canUseMafiaChat = myRole === 'mafia';
  const canUseDeadChat = !isAlive;

  useEffect(() => {
    let timer: any;
    if (memeCooldown > 0) {
      timer = setInterval(() => {
        setMemeCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [memeCooldown]);

  useEffect(() => {
    socket.on('chat_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.senderId !== socket.id) {
        playMessageChime();
      }
    });

    socket.on('play_audio_meme', ({ type, senderName }) => {
      queueAudioMeme(type);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderName: '🎵 ميم مصري ساخر',
          senderAvatar: '🔊',
          senderId: 'system',
          senderRole: null,
          message: `${senderName || 'لاعب'} شغل ميم: ${getMemeLabel(type)}`,
          channel: 'general',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    });

    return () => {
      socket.off('chat_message');
      socket.off('play_audio_meme');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const queueAudioMeme = (type: string) => {
    audioQueueRef.current.push(type);
    processAudioQueue();
  };

  const processAudioQueue = () => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) return;
    isPlayingAudioRef.current = true;
    const nextType = audioQueueRef.current.shift()!;
    playMasryMemeSound(nextType, () => {
      isPlayingAudioRef.current = false;
      setTimeout(processAudioQueue, 600);
    });
  };

  const playMessageChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // ignore
    }
  };

  const getMemeLabel = (type: string) => {
    switch (type) {
      case 'faaaaa': return '😮‍💨 فااااااااا';
      case 'kafr_elsheikh': return '🔥 كفر الشيخ رقم واحد';
      case 'no_biskota': return '🍪 نوو بسكوته نووو';
      case 'oh_helwa': return '😏 اوه حلوه يا ولد ثبتني';
      case 'zeheqt': return '🤦‍♂️ لا انا زهقت الصراحه';
      case 'seyah': return '📢 صياااااح';
      case 'ana_hamoot': return '💀 انا همووووت';
      default: return type;
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket.emit('send_chat', { message: inputMessage.trim(), channel });
    setInputMessage('');
    setShowStickers(false);
    setShowMemes(false);
  };

  const sendSticker = (sticker: string) => {
    socket.emit('send_chat', { message: sticker, channel });
    setShowStickers(false);
  };

  const triggerAudioMeme = (type: string) => {
    if (memeCooldown > 0) return;
    socket.emit('play_audio_meme', { type });
    queueAudioMeme(type);
    setShowMemes(false);
    setMemeCooldown(15);
  };

  const playMasryMemeSound = (type: string, onEnded?: () => void) => {
    const finish = () => {
      if (onEnded) onEnded();
    };

    let audioPath = '';
    if (type === 'faaaaa') audioPath = '/sounds/faaaaa.mpeg';
    if (type === 'kafr_elsheikh') audioPath = '/sounds/kafr_elsheikh.mpeg';
    if (type === 'no_biskota') audioPath = '/sounds/no_biskota.mpeg';
    if (type === 'oh_helwa') audioPath = '/sounds/oh_helwa.mpeg';
    if (type === 'zeheqt') audioPath = '/sounds/zeheqt.mpeg';
    if (type === 'seyah') audioPath = '/sounds/seyah.mpeg';
    if (type === 'ana_hamoot') audioPath = '/sounds/ana_hamoot.mpeg';

    if (audioPath) {
      const audio = new Audio(audioPath);
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch((e) => {
        console.error('Audio play error', e);
        finish();
      });
      return;
    }

    finish();
  };

  return (
    <div className="glass-card rounded-3xl flex flex-col h-72 md:h-96 shadow-xl overflow-hidden border border-white/10 relative w-full">
      {/* Channels Tab Bar */}
      <div className="flex border-b border-white/10 bg-white/5 backdrop-blur-md">
        <button
          onClick={() => setChannel('general')}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-colors ${
            channel === 'general'
              ? 'bg-accentPurple/25 text-accentPurple border-b-2 border-accentPurple'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>عام</span>
        </button>

        {canUseMafiaChat && (
          <button
            onClick={() => setChannel('mafia')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-colors ${
              channel === 'mafia'
                ? 'bg-neonRed/25 text-neonRed border-b-2 border-neonRed'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>مافيا</span>
          </button>
        )}

        {canUseDeadChat && (
          <button
            onClick={() => setChannel('dead')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-colors ${
              channel === 'dead'
                ? 'bg-gray-800/60 text-gray-200 border-b-2 border-gray-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            <span>أموات</span>
          </button>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {messages
          .filter((m) => {
            if (channel === 'mafia') return m.channel === 'mafia';
            if (channel === 'dead') return m.channel === 'dead';
            return m.channel === 'general';
          })
          .map((msg) => (
            <div
              key={msg.id}
              className={`p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm backdrop-blur-md ${
                msg.senderId === 'system'
                  ? 'bg-yellow-950/40 border border-yellow-800/50 text-center text-yellow-300 font-bold'
                  : msg.senderId === socket.id
                  ? 'bg-purple-950/40 border border-purple-500/30 ml-2 sm:ml-4'
                  : 'bg-white/5 border border-white/10 mr-2 sm:mr-4'
              }`}
            >
              {msg.senderId !== 'system' && (
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] sm:text-xs text-purple-300 flex items-center gap-1">
                    <span>{msg.senderAvatar}</span>
                    <span>{msg.senderName}</span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-gray-400">{msg.time}</span>
                </div>
              )}
              <p className="text-gray-200 break-words text-xs sm:text-sm">{msg.message}</p>
            </div>
          ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Stickers Picker Popover */}
      {showStickers && (
        <div className="absolute bottom-16 left-2 right-2 glass-card p-2 rounded-2xl border border-white/20 grid grid-cols-6 gap-1.5 bg-darkBg/95 backdrop-blur-lg z-20 shadow-2xl">
          {STICKERS.map((st) => (
            <button
              key={st}
              onClick={() => sendSticker(st)}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-accentPurple flex items-center justify-center text-xl hover:scale-110 transition-transform border border-white/10"
            >
              {st}
            </button>
          ))}
        </div>
      )}

      {/* Masry Audio Memes Picker Popover */}
      {showMemes && (
        <div className="absolute bottom-16 left-2 right-2 glass-card p-2.5 rounded-2xl border border-white/20 space-y-1.5 bg-darkBg/95 backdrop-blur-lg z-20 shadow-2xl">
          <div className="text-[11px] font-bold text-purple-300 px-1">🎭 اختر ميم مصري ساخر للجميع:</div>
          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
            {AUDIO_MEMES_MASRY.map((m) => (
              <button
                key={m.id}
                onClick={() => triggerAudioMeme(m.id)}
                className="p-2 rounded-xl bg-white/5 hover:bg-accentPurple/40 border border-white/10 flex items-center gap-2 text-xs font-bold transition-all text-right"
              >
                <span className="text-base">{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box & Action Buttons */}
      <form onSubmit={sendMessage} className="p-2 sm:p-3 border-t border-white/10 bg-white/5 backdrop-blur-md flex gap-1.5 items-center">
        <button
          type="button"
          onClick={() => { setShowStickers(!showStickers); setShowMemes(false); }}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-purple-300 border border-white/10 transition-colors"
          title="استكرات"
        >
          <Smile className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (memeCooldown === 0) {
              setShowMemes(!showMemes);
              setShowStickers(false);
            }
          }}
          disabled={memeCooldown > 0}
          className={`p-2 rounded-xl border border-white/10 transition-colors flex items-center gap-1 ${
            memeCooldown > 0
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-white/5 hover:bg-white/10 text-yellow-400'
          }`}
          title={memeCooldown > 0 ? `انتظر ${memeCooldown} ثانية` : 'ميمز مصرية'}
        >
          <Music className="w-4 h-4" />
          {memeCooldown > 0 && <span className="text-[10px] font-bold font-mono">{memeCooldown}s</span>}
        </button>

        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={
            channel === 'mafia'
              ? 'رسالة سرية...'
              : channel === 'dead'
              ? 'دردشة الأموات...'
              : 'اكتب للجميع...'
          }
          className="flex-1 glass-input rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none min-w-0"
        />

        <button
          type="submit"
          className="p-2 bg-accentPurple hover:bg-purple-600 rounded-xl text-white transition-colors shadow-lg glow-purple"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
