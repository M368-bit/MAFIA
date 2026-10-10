import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { RoomData } from '../App';
import { ArrowRight, Bot, Play, Sparkles } from 'lucide-react';

interface PlayWithAIProps {
  socket: Socket;
  playerName: string;
  playerAvatar: string;
  onBack: () => void;
  onRoomJoined: (room: RoomData) => void;
}

export default function PlayWithAI({
  socket,
  playerName,
  playerAvatar,
  onBack,
  onRoomJoined,
}: PlayWithAIProps) {
  const [loading, setLoading] = useState(false);

  const startAIGame = () => {
    setLoading(true);
    socket.emit(
      'create_room',
      {
        playerName: playerName || 'أنت',
        avatar: playerAvatar || '🕵️‍♂️',
        settings: {
          maxPlayers: 6,
          discussionTime: 45,
          votingTime: 25,
          nightTime: 15,
          enableSpecialRoles: true,
          doctorSelfHeal: true,
          isPublic: false,
        },
        userId: localStorage.getItem('mafia_user_id'),
        vsAI: true,
      },
      (res: any) => {
        setLoading(false);
        if (res.success && res.room) {
          onRoomJoined(res.room);
        } else {
          alert(res.error || 'حدث خطأ أثناء إنشاء مباراة الذكاء الاصطناعي');
        }
      }
    );
  };

  return (
    <div className="w-full max-w-lg glass-card p-6 md:p-8 rounded-3xl shadow-2xl animate-fade-in text-center relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-accentPurple/20 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <button
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-purple-300 hover:bg-white/10 transition-colors"
        >
          <ArrowRight className="w-6 h-6" />
        </button>

        <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
          <Bot className="w-6 h-6 text-accentPurple" />
          <span>العب مع الذكاء الاصطناعي (AI)</span>
        </h2>

        <div className="w-10"></div>
      </div>

      <div className="space-y-6">
        <div className="w-24 h-24 bg-accentPurple/20 border-2 border-accentPurple/60 rounded-3xl flex items-center justify-center text-5xl mx-auto glow-purple shadow-xl">
          🤖
        </div>

        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-sm text-gray-200 leading-relaxed space-y-2">
          <p className="font-bold text-purple-300 flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>تجربة كاملة بأحدث نظام جيم بلاي لعام 2026</span>
          </p>
          <p className="text-xs text-gray-300">
            ستلعب ضد 5 أسطول من لاعبي الذكاء الاصطناعي الأذكياء، مع عجلة توزيع الرتب، وشاشات المراحل الكبيرة، وتحقيقات المحقق السرية، والتصويت المرئي الكامل!
          </p>
        </div>

        <button
          onClick={startAIGame}
          disabled={loading}
          className={`w-full py-4 bg-gradient-to-r from-accentPurple to-purple-700 hover:from-purple-600 hover:to-accentPurple rounded-2xl font-bold text-lg shadow-lg glow-purple transition-transform active:scale-95 border border-purple-400/30 flex items-center justify-center gap-3 text-white ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Play className="w-6 h-6 fill-white" />
          <span>{loading ? 'جارٍ إعداد غرفة AI...' : 'بدء المعركة مع AI الآن'}</span>
        </button>
      </div>
    </div>
  );
}
