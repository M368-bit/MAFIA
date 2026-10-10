import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { X, Search, UserPlus, Check, Users, Send } from 'lucide-react';

interface FriendsModalProps {
  socket: Socket;
  userData: any;
  onClose: () => void;
  roomCode?: string;
}

export default function FriendsModal({ socket, userData, onClose, roomCode }: FriendsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setMessage(null);

    socket.emit('search_user', { query: searchQuery.trim() }, (res: { success: boolean; results: any[] }) => {
      setSearching(false);
      if (res.success) {
        setSearchResults(res.results);
      }
    });
  };

  const sendRequest = (targetUserId: string) => {
    socket.emit('send_friend_request', { targetUserId }, (res: { success: boolean; message?: string; error?: string }) => {
      if (res.success) {
        setMessage('تم إرسال طلب الصداقة بنجاح!');
      } else {
        setMessage(res.error || 'فشل إرسال الطلب');
      }
      setTimeout(() => setMessage(null), 3000);
    });
  };

  const acceptRequest = (requesterId: string) => {
    socket.emit('accept_friend_request', { requesterId }, (res: { success: boolean }) => {
      if (res.success) {
        setMessage('تم قبول طلب الصداقة بنجاح!');
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const inviteFriend = (friendUserId: string) => {
    if (!roomCode) return;
    socket.emit('invite_friend_to_room', { friendUserId, roomCode }, (res: { success: boolean; message?: string; error?: string }) => {
      if (res.success) {
        setMessage('تم إرسال دعوة الغرفة بنجاح!');
      } else {
        setMessage(res.error || 'فشل إرسال الدعوة');
      }
      setTimeout(() => setMessage(null), 3000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card border border-white/15 w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-accentPurple/20 border border-accentPurple flex items-center justify-center text-xl">
              {userData?.avatar || '👤'}
            </span>
            <div>
              <h2 className="text-xl font-bold">{userData?.username}</h2>
              <span className="text-xs text-purple-300 font-mono">المعرف: #{userData?.tag}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/5 text-gray-400 hover:text-white transition-colors border border-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {message && (
            <div className="bg-accentPurple/20 border border-accentPurple text-purple-200 p-3 rounded-2xl text-center text-sm backdrop-blur-md">
              {message}
            </div>
          )}

          {/* Search Section */}
          <div>
            <h3 className="font-bold text-sm text-gray-300 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-accentPurple" />
              <span>بحث عن صديق (بالاسم أو المعرف #Tag)</span>
            </h3>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="مثال: أحمد أو 4821..."
                className="flex-1 glass-input rounded-2xl px-4 py-3 text-sm text-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-5 py-3 bg-accentPurple hover:bg-purple-600 rounded-2xl font-bold text-sm shadow-lg glow-purple transition-transform active:scale-95 border border-purple-400/30"
              >
                بحث
              </button>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((user) => {
                  const isMe = user.id === userData?.id;
                  const isAlreadyFriend = userData?.friends?.some((f: any) => f.id === user.id);

                  return (
                    <div key={user.id} className="glass-card p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{user.avatar}</span>
                        <div>
                          <span className="font-bold text-sm">{user.username}</span>
                          <span className="text-xs text-gray-400 block font-mono">#{user.tag}</span>
                        </div>
                      </div>

                      {isMe ? (
                        <span className="text-xs bg-white/10 text-purple-300 px-3 py-1.5 rounded-xl border border-white/10">
                          هذا أنت 🕵️‍♂️
                        </span>
                      ) : isAlreadyFriend ? (
                        <span className="text-xs bg-green-950/60 text-green-400 px-3 py-1.5 rounded-xl border border-green-900/60">
                          صديقك ✔️
                        </span>
                      ) : (
                        <button
                          onClick={() => sendRequest(user.id)}
                          className="px-3 py-1.5 bg-purple-950/60 border border-purple-800 hover:bg-purple-900 rounded-xl text-xs font-bold flex items-center gap-1 text-purple-200"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> إضافة
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Requests */}
          {userData?.requests?.length > 0 && (
            <div>
              <h3 className="font-bold text-sm text-gray-300 mb-2">📥 طلبات الصداقة الواردة</h3>
              <div className="space-y-2">
                {userData.requests.map((req: any) => (
                  <div key={req.id} className="glass-card p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{req.avatar}</span>
                      <div>
                        <span className="font-bold text-sm">{req.username}</span>
                        <span className="text-xs text-gray-400 block font-mono">#{req.tag}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => acceptRequest(req.id)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-xl text-xs font-bold flex items-center gap-1 text-white shadow"
                    >
                      <Check className="w-3.5 h-3.5" /> قبول
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div>
            <h3 className="font-bold text-sm text-gray-300 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-accentPurple" />
              <span>قائمة أصدقائي ({userData?.friends?.length || 0})</span>
            </h3>
            {(!userData?.friends || userData.friends.length === 0) ? (
              <div className="text-center py-6 text-gray-500 text-sm glass-card rounded-2xl border border-white/10">
                لا يوجد أصدقاء مضافون حتى الآن. ابحث عن أصدقائك وأضفهم!
              </div>
            ) : (
              <div className="space-y-2">
                {userData.friends.map((friend: any) => (
                  <div key={friend.id} className="glass-card p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <span className="text-xl">{friend.avatar}</span>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-darkBg ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                      </div>
                      <div>
                        <span className="font-bold text-sm">{friend.username}</span>
                        <span className="text-xs text-gray-400 block font-mono">#{friend.tag}</span>
                      </div>
                    </div>

                    {roomCode && (
                      <button
                        onClick={() => inviteFriend(friend.id)}
                        className="px-3 py-1.5 bg-accentPurple hover:bg-purple-600 rounded-xl text-xs font-bold flex items-center gap-1 text-white shadow"
                      >
                        <Send className="w-3.5 h-3.5" /> دعوة للغرفة
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
