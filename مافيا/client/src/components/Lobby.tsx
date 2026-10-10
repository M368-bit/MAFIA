import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { RoomData } from '../App';
import ChatBox from './ChatBox';
import VoiceChat from './VoiceChat';
import ConfirmModal from './ConfirmModal';
import { Users, Copy, Check, Play, LogOut, Crown, UserPlus } from 'lucide-react';

interface LobbyProps {
  socket: Socket;
  roomData: RoomData;
  onLeave: () => void;
  onOpenFriends: () => void;
  userData: any;
}

export default function Lobby({ socket, roomData, onLeave, onOpenFriends }: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const myId = socket.id;
  const me = roomData.players[myId!];
  const isHost = me?.isHost;

  const playersList = Object.values(roomData.players);
  const readyCount = playersList.filter((p: any) => p.isReady).length;
  const canStart = isHost && playersList.length >= 4;

  const copyInviteLink = () => {
    const url = `${window.location.origin}?code=${roomData.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const toggleReady = () => {
    socket.emit('toggle_ready');
  };

  const startGame = () => {
    socket.emit('start_game');
  };

  const handleLeave = () => {
    setShowConfirmLeave(true);
  };

  const confirmLeave = () => {
    socket.emit('leave_room');
    onLeave();
  };

  return (
    <div className="w-full max-w-4xl glass-card p-6 md:p-8 rounded-3xl shadow-2xl animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="text-xs text-purple-300 font-semibold tracking-wider">غرفة الانتظار (Lobby)</span>
          <h2 className="text-3xl font-black flex items-center gap-3 mt-1">
            <span>رمز الغرفة:</span>
            <span className="bg-accentPurple/20 border border-accentPurple text-accentPurple px-4 py-1 rounded-2xl tracking-widest backdrop-blur-md">
              {roomData.code}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button
            onClick={onOpenFriends}
            className="px-4 py-2.5 bg-accentPurple/30 border border-accentPurple/60 hover:bg-accentPurple/40 rounded-2xl font-bold flex items-center gap-2 transition-all text-sm text-purple-200 backdrop-blur-md"
          >
            <UserPlus className="w-4 h-4 text-accentPurple" />
            <span>دعوة أصدقاء</span>
          </button>

          <button
            onClick={copyInviteLink}
            className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl font-bold flex items-center gap-2 transition-all text-sm backdrop-blur-md"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-accentPurple" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
          </button>

          <button
            onClick={handleLeave}
            className="p-2.5 bg-red-950/40 border border-red-900/60 hover:bg-red-900/50 rounded-2xl text-neonRed transition-all backdrop-blur-md"
            title="مغادرة الغرفة"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Players & Chat/Voice */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Players List */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-200 flex items-center gap-2">
              <Users className="w-5 h-5 text-accentPurple" />
              <span>اللاعبون المنضمون ({playersList.length} / {roomData.settings.maxPlayers}) — الجاهزون: ({readyCount}/{playersList.length})</span>
            </h3>
            <span className="text-xs text-gray-400">الحد الأدنى للبدء: 4</span>
          </div>

          <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto p-1">
            {playersList.map((player) => (
              <div
                key={player.id}
                className={`glass-card border p-4 rounded-2xl flex items-center justify-between ${
                  player.id === roomData.hostId ? 'border-accentPurple/60 shadow-lg glow-purple' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl backdrop-blur-md">
                    {player.avatar}
                  </span>
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span>{player.name}</span>
                      {player.id === roomData.hostId && (
                        <span title="مضيف الغرفة">
                          <Crown className="w-4 h-4 text-yellow-400" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {player.isConnected ? 'متصل' : 'غير متصل'}
                    </span>
                  </div>
                </div>

                <div>
                  {player.id === roomData.hostId ? (
                    <div className="flex items-center gap-1.5">
                      <span className="bg-purple-900/40 text-purple-300 px-2.5 py-1 rounded-xl text-xs font-bold border border-purple-800/60 backdrop-blur-md">
                        المضيف
                      </span>
                      {player.isReady ? (
                        <span className="bg-green-950/60 text-green-400 px-2.5 py-1 rounded-xl text-xs font-bold border border-green-900/60 flex items-center gap-1 backdrop-blur-md">
                          <Check className="w-3 h-3" /> جاهز
                        </span>
                      ) : (
                        <span className="bg-yellow-950/60 text-yellow-400 px-2.5 py-1 rounded-xl text-xs font-bold border border-yellow-900/60 backdrop-blur-md">
                          انتظار
                        </span>
                      )}
                    </div>
                  ) : player.isReady ? (
                    <span className="bg-green-950/60 text-green-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-green-900/60 flex items-center gap-1 backdrop-blur-md">
                      <Check className="w-3.5 h-3.5" /> جاهز
                    </span>
                  ) : (
                    <span className="bg-yellow-950/60 text-yellow-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-yellow-900/60 backdrop-blur-md">
                      انتظار
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat & Voice Chat in Lobby */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-gray-200 flex items-center gap-2">
            <span>الدردشة والصوت في الغرفة</span>
          </h3>
          <ChatBox socket={socket} myRole={null} isAlive={true} />
          <VoiceChat socket={socket} roomData={roomData} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-white/10 flex flex-col md:flex-row gap-4">
        <button
          onClick={toggleReady}
          className={`flex-1 py-4 rounded-2xl font-bold text-lg shadow-lg transition-transform active:scale-95 border backdrop-blur-md ${
            me?.isReady
              ? 'bg-red-950/60 border-red-800 text-red-200'
              : 'bg-green-600/90 hover:bg-green-500 border-green-500 text-white shadow-lg'
          }`}
        >
          {me?.isReady ? 'إلغاء الجاهزية' : 'أنا جاهز للعب!'}
        </button>

        {isHost && (
          <button
            onClick={startGame}
            disabled={!canStart}
            className={`flex-1 py-4 bg-gradient-to-r from-accentPurple to-purple-700 hover:from-purple-600 hover:to-accentPurple rounded-2xl font-bold text-lg shadow-lg glow-purple transition-transform active:scale-95 flex items-center justify-center gap-2 border border-purple-400/30 ${
              !canStart ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Play className="w-5 h-5 fill-white" />
            <span>بدء المباراة الآن</span>
          </button>
        )}
      </div>

      {/* Confirm Leave Modal */}
      {showConfirmLeave && (
        <ConfirmModal
          title="تأكيد مغادرة الغرفة"
          message="هل أنت متأكد من رغبتك في مغادرة الغرفة؟ سيتم إغلاق الغرفة إذا كنت أنت المضيف."
          onConfirm={confirmLeave}
          onCancel={() => setShowConfirmLeave(false)}
        />
      )}
    </div>
  );
}
