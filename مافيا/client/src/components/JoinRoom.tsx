import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { RoomData } from '../App';
import { ArrowRight, LogIn, KeyRound } from 'lucide-react';

interface JoinRoomProps {
  socket: Socket;
  playerName: string;
  playerAvatar: string;
  onBack: () => void;
  onRoomJoined: (room: RoomData) => void;
}

export default function JoinRoom({
  socket,
  playerName,
  playerAvatar,
  onBack,
  onRoomJoined,
}: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError('الرجاء إدخال رمز الغرفة!');
      return;
    }
    if (!playerName.trim()) {
      setError('الرجاء إدخال اسمك في الصفحة الرئيسية أولاً!');
      return;
    }

    setLoading(true);
    setError(null);

    socket.emit(
      'join_room',
      {
        code: roomCode.trim(),
        playerName,
        avatar: playerAvatar,
        userId: localStorage.getItem('mafia_user_id'),
      },
      (response: { success: boolean; roomId?: string; room?: RoomData; error?: string }) => {
        setLoading(false);
        if (!response.success) {
          setError(response.error || 'فشل الانضمام إلى الغرفة');
        } else if (response.room) {
          onRoomJoined(response.room);
        }
      }
    );
  };

  return (
    <div className="w-full max-w-md glass-card p-6 md:p-8 rounded-3xl shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <button
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-purple-300 hover:bg-white/10 transition-colors"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <LogIn className="w-6 h-6 text-accentPurple" />
          <span>انضمام إلى غرفة</span>
        </h2>
        <div className="w-10"></div>
      </div>

      <form onSubmit={handleJoin} className="space-y-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-accentPurple" />
            <span>رمز الغرفة المكون من 6 أرقام/حروف</span>
          </label>
          <input
            type="text"
            maxLength={6}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="مثال: A7K9X2"
            className="w-full glass-input rounded-2xl px-4 py-4 text-center text-2xl font-bold tracking-widest text-white uppercase focus:outline-none transition-all"
          />
        </div>

        {error && (
          <div className="bg-neonRed/20 border border-neonRed text-neonRed p-3.5 rounded-2xl text-center text-sm backdrop-blur-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-accentPurple to-purple-700 hover:from-purple-600 hover:to-accentPurple rounded-2xl font-bold text-lg shadow-lg glow-purple transition-transform active:scale-95 disabled:opacity-50 border border-purple-400/30"
        >
          {loading ? 'جاري الانضمام...' : 'دخول الغرفة'}
        </button>
      </form>
    </div>
  );
}
