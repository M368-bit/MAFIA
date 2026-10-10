import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { RoomData } from '../App';
import { ArrowRight, Settings, Users, ShieldCheck, Globe, Lock } from 'lucide-react';

interface CreateRoomProps {
  socket: Socket;
  playerName: string;
  playerAvatar: string;
  onBack: () => void;
  onRoomJoined: (room: RoomData) => void;
}

export default function CreateRoom({
  socket,
  playerName,
  playerAvatar,
  onBack,
  onRoomJoined,
}: CreateRoomProps) {
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [discussionTime, setDiscussionTime] = useState(60);
  const [votingTime, setVotingTime] = useState(30);
  const [nightTime, setNightTime] = useState(45);
  const [enableSpecialRoles, setEnableSpecialRoles] = useState(true);
  const [doctorSelfHeal, setDoctorSelfHeal] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    if (!playerName.trim()) return;
    setLoading(true);

    let responded = false;
    const timer = setTimeout(() => {
      if (!responded) {
        setLoading(false);
        alert('انتهت مهلة الاتصال بالخادم. تأكد من أن خادم الـ Node.js يعمل!');
      }
    }, 5000);

    socket.emit(
      'create_room',
      {
        playerName,
        avatar: playerAvatar,
        userId: localStorage.getItem('mafia_user_id'),
        settings: {
          maxPlayers,
          discussionTime,
          votingTime,
          nightTime,
          enableSpecialRoles,
          doctorSelfHeal,
          isPublic,
        },
      },
      (response: { success: boolean; roomId?: string; room?: RoomData; error?: string }) => {
        responded = true;
        clearTimeout(timer);
        setLoading(false);
        if (response && !response.success) {
          alert(response.error || 'فشل إنشاء الغرفة');
        } else if (response && response.room) {
          onRoomJoined(response.room);
        }
      }
    );
  };

  return (
    <div className="w-full max-w-lg glass-card p-6 md:p-8 rounded-3xl shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <button
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-purple-300 hover:bg-white/10 transition-colors"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-accentPurple" />
          <span>إعدادات الغرفة</span>
        </h2>
        <div className="w-10"></div>
      </div>

      <div className="space-y-6">
        {/* Max Players */}
        <div>
          <label className="flex items-center justify-between text-sm text-gray-300 mb-2 font-semibold">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accentPurple" />
              <span>الحد الأقصى للاعبين</span>
            </span>
            <span className="text-accentPurple font-bold bg-accentPurple/20 border border-accentPurple/40 px-3 py-1 rounded-xl">
              {maxPlayers} لاعبين
            </span>
          </label>
          <input
            type="range"
            min={4}
            max={16}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
            className="w-full accent-accentPurple bg-white/10 h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>4 (حد أدنى)</span>
            <span>16 (حد أقصى)</span>
          </div>
        </div>

        {/* Timers */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-3 rounded-2xl text-center border border-white/10">
            <span className="block text-xs text-gray-400 mb-1">وقت النقاش</span>
            <select
              value={discussionTime}
              onChange={(e) => setDiscussionTime(parseInt(e.target.value))}
              className="w-full glass-input text-white text-sm rounded-xl p-2 focus:outline-none"
            >
              <option value={30} className="bg-darkBg">30 ثانية</option>
              <option value={60} className="bg-darkBg">60 ثانية</option>
              <option value={90} className="bg-darkBg">90 ثانية</option>
              <option value={120} className="bg-darkBg">120 ثانية</option>
            </select>
          </div>

          <div className="glass-card p-3 rounded-2xl text-center border border-white/10">
            <span className="block text-xs text-gray-400 mb-1">وقت التصويت</span>
            <select
              value={votingTime}
              onChange={(e) => setVotingTime(parseInt(e.target.value))}
              className="w-full glass-input text-white text-sm rounded-xl p-2 focus:outline-none"
            >
              <option value={20} className="bg-darkBg">20 ثانية</option>
              <option value={30} className="bg-darkBg">30 ثانية</option>
              <option value={45} className="bg-darkBg">45 ثانية</option>
            </select>
          </div>

          <div className="glass-card p-3 rounded-2xl text-center border border-white/10">
            <span className="block text-xs text-gray-400 mb-1">وقت الليل</span>
            <select
              value={nightTime}
              onChange={(e) => setNightTime(parseInt(e.target.value))}
              className="w-full glass-input text-white text-sm rounded-xl p-2 focus:outline-none"
            >
              <option value={30} className="bg-darkBg">30 ثانية</option>
              <option value={45} className="bg-darkBg">45 ثانية</option>
              <option value={60} className="bg-darkBg">60 ثانية</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <label className="flex items-center justify-between cursor-pointer glass-card p-3.5 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all">
            <span className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accentPurple" />
              <span>الأدوار الخاصة (محقق وطبيب)</span>
            </span>
            <input
              type="checkbox"
              checked={enableSpecialRoles}
              onChange={(e) => setEnableSpecialRoles(e.target.checked)}
              className="w-5 h-5 accent-accentPurple rounded cursor-pointer"
            />
          </label>

          {enableSpecialRoles && (
            <label className="flex items-center justify-between cursor-pointer glass-card p-3.5 rounded-2xl border border-white/10 mr-4">
              <span className="text-sm text-gray-300">سماح للطبيب بإنقاذ نفسه</span>
              <input
                type="checkbox"
                checked={doctorSelfHeal}
                onChange={(e) => setDoctorSelfHeal(e.target.checked)}
                className="w-4 h-4 accent-accentPurple rounded cursor-pointer"
              />
            </label>
          )}

          <label className="flex items-center justify-between cursor-pointer glass-card p-3.5 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all">
            <span className="text-sm font-semibold flex items-center gap-2">
              {isPublic ? <Globe className="w-5 h-5 text-green-400" /> : <Lock className="w-5 h-5 text-amber-400" />}
              <span>غرفة عامة (تظهر في قائمة الغرف)</span>
            </span>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-5 h-5 accent-accentPurple rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-accentPurple to-purple-700 hover:from-purple-600 hover:to-accentPurple rounded-2xl font-bold text-lg shadow-lg glow-purple transition-transform active:scale-95 disabled:opacity-50 mt-4 border border-purple-400/30"
        >
          {loading ? 'جاري إنشاء الغرفة...' : 'إطلاق الغرفة وبدء الانتظار'}
        </button>
      </div>
    </div>
  );
}
