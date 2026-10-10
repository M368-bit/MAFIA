import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { RoomData } from '../App';
import { ArrowRight, Globe, Users, Play } from 'lucide-react';

interface PublicRoomsProps {
  socket: Socket;
  playerName: string;
  playerAvatar: string;
  onBack: () => void;
  onRoomJoined: (room: RoomData) => void;
}

interface PublicRoomItem {
  id: string;
  code: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
}

export default function PublicRooms({
  socket,
  playerName,
  playerAvatar,
  onBack,
  onRoomJoined,
}: PublicRoomsProps) {
  const [rooms, setRooms] = useState<PublicRoomItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    socket.emit('get_public_rooms', (list: PublicRoomItem[]) => {
      setRooms(list);
      setLoading(false);
    });

    socket.on('public_rooms_updated', (list: PublicRoomItem[]) => {
      setRooms(list);
    });

    return () => {
      socket.off('public_rooms_updated');
    };
  }, [socket]);

  const joinRoomByCode = (code: string) => {
    if (!playerName.trim()) {
      alert('الرجاء إدخال اسمك في الصفحة الرئيسية أولاً!');
      return;
    }

    socket.emit(
      'join_room',
      { code, playerName, avatar: playerAvatar, userId: localStorage.getItem('mafia_user_id') },
      (response: { success: boolean; room?: RoomData; error?: string }) => {
        if (!response.success) {
          alert(response.error || 'فشل الانضمام');
        } else if (response.room) {
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
          <Globe className="w-6 h-6 text-accentPurple" />
          <span>الغرف العامة المتاحة</span>
        </h2>
        <div className="w-10"></div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">جاري البحث عن غرف نشطة...</div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12 text-gray-400 glass-card rounded-2xl border border-white/10">
          <p className="mb-2 text-lg">لا توجد غرف عامة حاليًا!</p>
          <p className="text-sm text-gray-500">أنشئ غرفة جديدة وشارك رمزها مع أصدقائك.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {rooms.map((r) => (
            <div
              key={r.id}
              className="glass-card border border-white/10 p-4 rounded-2xl flex items-center justify-between hover:border-accentPurple transition-colors"
            >
              <div>
                <div className="font-bold text-lg mb-1 flex items-center gap-2">
                  <span>غرفة المضيف: {r.hostName}</span>
                  <span className="text-xs bg-accentPurple/20 text-purple-300 px-2.5 py-1 rounded-xl border border-accentPurple/40">
                    {r.code}
                  </span>
                </div>
                <div className="text-sm text-gray-400 flex items-center gap-2">
                  <Users className="w-4 h-4 text-accentPurple" />
                  <span>
                    {r.playerCount} / {r.maxPlayers} لاعبين
                  </span>
                </div>
              </div>

              <button
                onClick={() => joinRoomByCode(r.code)}
                className="px-4 py-2.5 bg-accentPurple hover:bg-purple-600 rounded-2xl font-bold flex items-center gap-2 shadow-lg glow-purple transition-transform active:scale-95 border border-purple-400/30"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>انضمام</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
