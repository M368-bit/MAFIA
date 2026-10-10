import React, { useState } from 'react';
import { Screen } from '../App';
import ConfirmModal from './ConfirmModal';
import { PlusCircle, LogIn, Globe, BookOpen, User, Users, LogOut, Bot } from 'lucide-react';

interface HomeProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  playerAvatar: string;
  setPlayerAvatar: (avatar: string) => void;
  onNavigate: (screen: Screen) => void;
  onOpenRules: () => void;
  onOpenFriends: () => void;
  onLogout: () => void;
  userData: any;
}

const AVATARS = ['🕵️‍♂️', '🦹‍♂️', '🧛‍♂️', '🦊', '💀', '🤖', '👑', '🕶️', '🧙‍♂️', '🦁'];

export default function Home({
  playerName,
  setPlayerName,
  playerAvatar,
  setPlayerAvatar,
  onNavigate,
  onOpenRules,
  onOpenFriends,
  onLogout,
  userData,
}: HomeProps) {
  const [nameError, setNameError] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const handleAction = (screen: Screen) => {
    if (!playerName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    onNavigate(screen);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg px-4 animate-fade-in">
      {/* Top Bar with Profile & Friends & Logout */}
      <div className="w-full flex justify-between items-center mb-4 gap-2">
        {userData ? (
          <div className="glass-card px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 text-xs">
            <span>{userData.avatar}</span>
            <span className="font-bold">{userData.username}</span>
            <span className="text-purple-300 font-mono">#{userData.tag}</span>
          </div>
        ) : (
          <div></div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFriends}
            className="glass-card px-3.5 py-2 rounded-2xl border border-white/10 hover:border-accentPurple text-xs font-bold flex items-center gap-1.5 text-purple-200 transition-all shadow"
          >
            <Users className="w-3.5 h-3.5 text-accentPurple" />
            <span>الأصدقاء ({userData?.friends?.length || 0})</span>
          </button>

          <button
            onClick={() => setShowConfirmLogout(true)}
            className="glass-card px-3 py-2 rounded-2xl border border-red-500/30 hover:bg-red-950/40 text-xs font-bold flex items-center gap-1 text-red-400 transition-all"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Game Logo & Title */}
      <div className="text-center mb-6 relative w-full">
        <div className="absolute -inset-1 bg-gradient-to-r from-accentPurple to-neonRed rounded-3xl blur-xl opacity-30 animate-pulse"></div>
        <div className="relative glass-card p-8 rounded-3xl flex flex-col items-center">
          <div className="w-24 h-24 bg-accentPurple/20 border-2 border-accentPurple/60 rounded-2xl flex items-center justify-center text-5xl mb-4 glow-purple backdrop-blur-md">
            🦹‍♂️
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-accentPurple mb-2">
            MAFIA NIGHT
          </h1>
          <p className="text-purple-300 font-semibold tracking-wide text-sm md:text-base">
            اكشف الخائن... أو اخدع الجميع.
          </p>
        </div>
      </div>

      {/* Player Profile Setup */}
      <div className="w-full glass-card p-6 rounded-3xl shadow-2xl mb-6">
        <h2 className="text-lg font-bold text-gray-200 mb-3 flex items-center gap-2">
          <User className="w-5 h-5 text-accentPurple" />
          <span>هويتك في اللعبة</span>
        </h2>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">اسم اللاعب</label>
          <input
            type="text"
            maxLength={15}
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              if (e.target.value.trim()) setNameError(false);
            }}
            placeholder="اكتب اسمك المستعار..."
            className={`w-full glass-input rounded-2xl px-4 py-3.5 text-white focus:outline-none transition-all ${
              nameError ? 'border-neonRed ring-2 ring-neonRed/30' : ''
            }`}
          />
          {nameError && <p className="text-neonRed text-xs mt-1">الرجاء إدخال اسم اللاعب أولاً!</p>}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">اختر صورتك الرمزية</label>
          <div className="flex flex-wrap gap-2 justify-center">
            {AVATARS.map((av) => (
              <button
                key={av}
                onClick={() => setPlayerAvatar(av)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                  playerAvatar === av
                    ? 'bg-accentPurple/80 border-2 border-white scale-110 glow-purple shadow-lg'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleAction('create')}
          className="w-full py-4 bg-gradient-to-r from-accentPurple to-purple-700 hover:from-purple-600 hover:to-accentPurple rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg glow-purple transition-transform active:scale-95 border border-purple-400/30 backdrop-blur-md"
        >
          <PlusCircle className="w-6 h-6" />
          <span>إنشاء غرفة جديدة</span>
        </button>

        <button
          onClick={() => handleAction('join')}
          className="w-full py-4 glass-card hover:bg-white/10 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-transform active:scale-95 text-purple-200 border border-purple-800/50"
        >
          <LogIn className="w-6 h-6 text-accentPurple" />
          <span>انضمام برمز الغرفة</span>
        </button>

        <button
          onClick={() => handleAction('public')}
          className="w-full py-4 glass-card hover:bg-white/10 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-transform active:scale-95 text-gray-200 border border-purple-800/40"
        >
          <Globe className="w-6 h-6 text-purple-400" />
          <span>الغرف العامة</span>
        </button>

        <button
          onClick={() => handleAction('ai')}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-800 hover:from-indigo-500 hover:to-purple-700 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg glow-purple transition-transform active:scale-95 border border-indigo-400/30 text-white"
        >
          <Bot className="w-6 h-6 text-yellow-400" />
          <span>العب مع الذكاء الاصطناعي (AI)</span>
        </button>
      </div>

      {/* Rules Button */}
      <button
        onClick={onOpenRules}
        className="mt-6 text-purple-300 hover:text-white text-sm flex items-center gap-2 transition-colors py-2.5 px-5 rounded-2xl glass-card border border-white/10 hover:border-purple-500/50"
      >
        <BookOpen className="w-4 h-4 text-accentPurple" />
        <span>قواعد اللعبة وشرح الأدوار</span>
      </button>

      {/* Confirm Logout Modal */}
      {showConfirmLogout && (
        <ConfirmModal
          title="تأكيد تسجيل الخروج"
          message="هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟"
          onConfirm={() => {
            setShowConfirmLogout(false);
            onLogout();
          }}
          onCancel={() => setShowConfirmLogout(false)}
        />
      )}
    </div>
  );
}
