import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface PartyModalProps {
  user: any;
  onStart: () => void;
}

export default function PartyModal({ user, onStart }: PartyModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-accentPurple/30 rounded-full blur-3xl animate-ping"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-neonRed/30 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="glass-card border border-purple-400/40 w-full max-w-md rounded-3xl shadow-2xl p-8 text-center flex flex-col items-center relative z-10 glow-purple">
        <div className="text-6xl mb-4 animate-bounce">
          🎉
        </div>
        <div className="w-20 h-20 rounded-2xl bg-accentPurple/20 border-2 border-accentPurple flex items-center justify-center text-4xl mb-4 glow-purple backdrop-blur-md">
          {user?.avatar || '🦹‍♂️'}
        </div>

        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-accentPurple mb-2">
          أهلاً بك يا بطل!
        </h2>
        <p className="text-purple-300 font-bold text-lg mb-1">
          {user?.username}
        </p>
        <div className="inline-block bg-accentPurple/20 border border-accentPurple/50 text-purple-200 px-4 py-1 rounded-full text-xs font-mono mb-6">
          المعرف الخاص بك: #{user?.tag}
        </div>

        <p className="text-gray-300 text-sm mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
          🎊 مبروك! تم إنشاء وتجهيز حسابك بنجاح في عالم <strong className="text-accentPurple">MAFIA NIGHT</strong>. استعد لكشف الخداع أو خداع الجميع!
        </p>

        <button
          onClick={onStart}
          className="w-full py-4 bg-gradient-to-r from-accentPurple to-purple-700 hover:from-purple-600 hover:to-accentPurple rounded-2xl font-bold text-lg shadow-lg glow-purple transition-transform active:scale-95 border border-purple-400/30 flex items-center justify-center gap-3 text-white"
        >
          <Sparkles className="w-5 h-5" />
          <span>ابدأ المغامرة الآن</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
