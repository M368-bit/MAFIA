import React, { useRef, useState } from 'react';
import { Home, Sparkles, Frown, Volume2, VolumeX } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface GameOverModalProps {
  winner: string | null;
  roomData: any;
  socketId: string;
  onReturnHome: () => void;
}

export default function GameOverModal({ winner, roomData, socketId, onReturnHome }: GameOverModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const me = roomData.players[socketId];
  const myRole = me?.role;
  const isMafia = myRole === 'mafia';
  const townWon = winner === 'town';

  // Determine if this specific player won or lost
  const playerWon = (isMafia && !townWon) || (!isMafia && townWon);

  const toggleVideoMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsAudioMuted(videoRef.current.muted);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in overflow-y-auto select-none">
      {/* Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-10 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse ${playerWon ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}></div>
      </div>

      <div className="glass-card border border-purple-400/40 w-full max-w-xl rounded-3xl shadow-2xl p-6 md:p-8 text-center flex flex-col items-center relative z-10 glow-purple my-auto">
        {/* Header Badge */}
        <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm mb-2">
          {playerWon ? <Sparkles className="w-5 h-5 animate-spin" /> : <Frown className="w-5 h-5 text-neonRed" />}
          <span>{playerWon ? 'بطاقة تهنئة الفوز الرسمية 🏆' : 'نتيجة المعركة: خسارة 💔'}</span>
          {playerWon ? <Sparkles className="w-5 h-5 animate-spin" /> : null}
        </div>

        <h2 className={`text-3xl md:text-5xl font-black mb-3 ${playerWon ? 'text-green-400 glow-purple' : 'text-neonRed'}`}>
          {playerWon ? 'فزت في المعركة!' : 'خاسررر 😣!'}
        </h2>

        {/* Embedded Video Card with Audio Control */}
        <div className="w-full rounded-2xl overflow-hidden border-2 border-purple-500/60 shadow-2xl mb-4 bg-darkBg relative glow-purple group">
          <video
            ref={videoRef}
            src={playerWon ? '/videos/victory.mp4' : '/videos/defeat.mp4'}
            autoPlay
            loop
            playsInline
            className="w-full h-48 md:h-64 object-cover"
          />

          {/* Unmute/Mute Floating Button */}
          <button
            onClick={toggleVideoMute}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-2xl backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 text-xs font-bold"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
            <span>{isAudioMuted ? 'تفعيل الصوت' : 'كتم الصوت'}</span>
          </button>

          <div className="absolute inset-0 bg-gradient-to-t from-darkBg/90 via-transparent to-transparent flex items-end p-4 pointer-events-none">
            <span className={`text-white font-bold text-sm px-3 py-1.5 rounded-xl backdrop-blur-md ${playerWon ? 'bg-accentPurple/80' : 'bg-neonRed/80'}`}>
              {playerWon ? 'انتصار مستحق لبطل المدينة! 🌟' : 'هارد لك يا بطل... حظ أفضل المرة القادمة 💔'}
            </span>
          </div>
        </div>

        <p className="text-gray-300 text-sm md:text-base mb-6">
          {playerWon
            ? 'لقد استطعت تحقيق الانتصار مع فريقك ببراعة في قراءة أسرار وخفايا المدينة.'
            : 'للأسف لم تنجح في هذه الجولة، تفوق الخصوم وانتهت المعركة لصالحهم.'}
        </p>

        {/* True Roles Disclosure */}
        <div className="w-full glass-card border border-white/10 rounded-2xl p-4 mb-6 max-h-48 overflow-y-auto text-right space-y-2">
          <h4 className="font-bold text-sm text-purple-300 mb-2 border-b border-white/10 pb-1">
            كشف أدوار جميع اللاعبين الحقيقية:
          </h4>
          {Object.values(roomData.players).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5">
              <span className="flex items-center gap-2 font-bold">
                <span>{p.avatar}</span>
                <span>{p.name}</span>
              </span>
              <span className="font-bold text-accentPurple bg-accentPurple/20 px-2.5 py-0.5 rounded-xl text-xs border border-accentPurple/40">
                {p.role === 'mafia' ? 'مافيا 🦹‍♂️' : p.role === 'detective' ? 'محقق 🔍' : p.role === 'doctor' ? 'طبيب 🩺' : 'مواطن 👤'}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onReturnHome}
          className="w-full py-4 bg-gradient-to-r from-accentPurple to-purple-700 hover:from-purple-600 hover:to-accentPurple rounded-2xl font-bold text-lg shadow-lg glow-purple transition-transform active:scale-95 flex items-center justify-center gap-2 border border-purple-400/30 text-white"
        >
          <Home className="w-5 h-5" />
          <span>العودة إلى القائمة الرئيسية</span>
        </button>
      </div>
    </div>
  );
}
