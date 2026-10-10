import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Home from './components/Home';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import PublicRooms from './components/PublicRooms';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import RulesModal from './components/RulesModal';
import FriendsModal from './components/FriendsModal';
import AuthModal from './components/AuthModal';
import PartyModal from './components/PartyModal';
import PlayWithAI from './components/PlayWithAI';

const SERVER_URL =
  typeof window !== 'undefined' && window.location.port === '3000'
    ? 'http://localhost:4000'
    : typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:4000';

export const socket: Socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

export type Screen = 'home' | 'create' | 'join' | 'public' | 'lobby' | 'game' | 'ai';

export interface RoomData {
  id: string;
  code: string;
  hostId: string;
  settings: {
    maxPlayers: number;
    discussionTime: number;
    votingTime: number;
    nightTime: number;
    enableSpecialRoles: boolean;
    doctorSelfHeal: boolean;
    isPublic: boolean;
  };
  players: Record<string, {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
    isReady: boolean;
    isConnected: boolean;
    role: string | null;
    isAlive: boolean;
    votedFor: string | null;
    doctorSelfHealUsed?: boolean;
  }>;
  gameState:
    | 'LOBBY'
    | 'ROLE_DISTRIBUTION'
    | 'NIGHT_INTRO'
    | 'NIGHT_MAFIA'
    | 'NIGHT_DOCTOR'
    | 'NIGHT_DETECTIVE'
    | 'NIGHT_RESULT'
    | 'DAY_DISCUSSION'
    | 'VOTING_DECISION'
    | 'VOTING_DECISION_RESULT'
    | 'VOTING_TARGETS'
    | 'VOTING_RESULT'
    | 'GAME_OVER'
    | 'NIGHT'
    | 'VOTING';
  timeRemaining: number;
  nightResultData?: {
    killedPlayerName: string | null;
    wasSaved: boolean;
  };
  votingDecisionData?: {
    voteCount: number;
    skipCount: number;
    decision: 'VOTE' | 'SKIP' | null;
  };
  votingResultData?: {
    eliminatedName: string | null;
    isMafia: boolean;
    isTie: boolean;
  };
  targetVotes?: Record<string, string>;
  decisionVotes?: Record<string, 'VOTE' | 'SKIP'>;
  logs: Array<{ text: string; type: string; time: number }>;
  winner: string | null;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [userData, setUserData] = useState<any>(null);
  const [celebratingUser, setCelebratingUser] = useState<any>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [playerAvatar, setPlayerAvatar] = useState<string>('🕵️‍♂️');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showFriends, setShowFriends] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<{ roomCode: string; inviterName: string } | null>(null);

  // Restore session on connect
  useEffect(() => {
    const restore = () => {
      const storedUserId = localStorage.getItem('mafia_user_id');
      if (storedUserId && !userData) {
        socket.emit('restore_session', { userId: storedUserId }, (res: { success: boolean; user?: any }) => {
          if (res.success && res.user) {
            setUserData(res.user);
            setPlayerName(res.user.username);
            setPlayerAvatar(res.user.avatar);
          }
        });
      }
    };

    socket.on('connect', restore);
    if (socket.connected) restore();

    socket.on('friend_request_received', (sender) => {
      setErrorMessage(`📩 وصلك طلب صداقة جديد من ${sender.username}`);
      refreshUser();
    });

    socket.on('friend_accepted', (friend) => {
      setErrorMessage(`🤝 وافق ${friend.username} على طلب الصداقة!`);
      refreshUser();
    });

    socket.on('room_invitation', ({ roomCode, inviterName }) => {
      setInvitation({ roomCode, inviterName });
    });

    socket.on('room_updated', (updatedRoom: RoomData) => {
      setRoomData(updatedRoom);
      if (updatedRoom.gameState !== 'LOBBY' && currentScreen === 'lobby') {
        setCurrentScreen('game');
      }
    });

    socket.on('game_started', (updatedRoom: RoomData) => {
      setRoomData(updatedRoom);
      setCurrentScreen('game');
    });

    socket.on('phase_changed', ({ room }) => {
      setRoomData(room);
      setCurrentScreen('game');
    });

    socket.on('role_assigned', () => {
      setCurrentScreen('game');
    });

    socket.on('game_over', ({ room }) => {
      setRoomData(room);
    });

    socket.on('error_message', (msg: string) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    return () => {
      socket.off('connect');
      socket.off('friend_request_received');
      socket.off('friend_accepted');
      socket.off('room_invitation');
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('phase_changed');
      socket.off('game_over');
      socket.off('error_message');
    };
  }, [currentScreen]);

  const refreshUser = () => {
    const storedUserId = localStorage.getItem('mafia_user_id');
    if (storedUserId) {
      socket.emit('restore_session', { userId: storedUserId }, (res: any) => {
        if (res.success && res.user) setUserData(res.user);
      });
    }
  };

  const handleAuthenticated = (user: any) => {
    setCelebratingUser(user);
    setPlayerName(user.username);
    setPlayerAvatar(user.avatar);
    localStorage.setItem('mafia_user_id', user.id);
  };

  const startAdventure = () => {
    setUserData(celebratingUser);
    setCelebratingUser(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('mafia_user_id');
    setUserData(null);
    setPlayerName('');
  };

  const acceptInvitation = () => {
    if (!invitation) return;
    socket.emit('join_room', { code: invitation.roomCode, playerName, avatar: playerAvatar, userId: userData?.id }, (res: any) => {
      if (res.success && res.room) {
        setRoomData(res.room);
        setCurrentScreen('lobby');
        setInvitation(null);
      } else {
        alert(res.error || 'فشل الانضمام للغرفة');
        setInvitation(null);
      }
    });
  };

  if (!userData && !celebratingUser) {
    return <AuthModal socket={socket} onAuthenticated={handleAuthenticated} />;
  }

  if (celebratingUser) {
    return <PartyModal user={celebratingUser} onStart={startAdventure} />;
  }

  return (
    <div className="min-h-screen bg-darkBg text-white flex flex-col items-center justify-between p-4 relative overflow-x-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accentPurple/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neonRed/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Error / Notification Toast */}
      {errorMessage && (
        <div className="fixed top-5 z-50 bg-accentPurple border border-purple-400 text-white px-6 py-3 rounded-2xl shadow-2xl animate-bounce flex items-center gap-3 backdrop-blur-md">
          <span>🔔</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Room Invitation Banner */}
      {invitation && (
        <div className="fixed top-20 z-50 glass-card border border-accentPurple text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-bounce">
          <span>🎮</span>
          <div>
            <p className="font-bold">دعوة من صديقك {invitation.inviterName}!</p>
            <p className="text-xs text-purple-300">هل تريد الانضمام إلى الغرفة ({invitation.roomCode})؟</p>
          </div>
          <button
            onClick={acceptInvitation}
            className="px-4 py-2 bg-accentPurple hover:bg-purple-600 rounded-xl font-bold text-sm shadow glow-purple"
          >
            انضمام
          </button>
          <button
            onClick={() => setInvitation(null)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm"
          >
            رفض
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="w-full max-w-4xl z-10 flex flex-col items-center flex-1 justify-center">
        {currentScreen === 'home' && (
          <Home
            playerName={playerName}
            setPlayerName={setPlayerName}
            playerAvatar={playerAvatar}
            setPlayerAvatar={setPlayerAvatar}
            onNavigate={setCurrentScreen}
            onOpenRules={() => setShowRules(true)}
            onOpenFriends={() => setShowFriends(true)}
            onLogout={handleLogout}
            userData={userData}
          />
        )}

        {currentScreen === 'create' && (
          <CreateRoom
            socket={socket}
            playerName={playerName}
            playerAvatar={playerAvatar}
            onBack={() => setCurrentScreen('home')}
            onRoomJoined={(room) => {
              setRoomData(room);
              setCurrentScreen('lobby');
            }}
          />
        )}

        {currentScreen === 'join' && (
          <JoinRoom
            socket={socket}
            playerName={playerName}
            playerAvatar={playerAvatar}
            onBack={() => setCurrentScreen('home')}
            onRoomJoined={(room) => {
              setRoomData(room);
              setCurrentScreen('lobby');
            }}
          />
        )}

        {currentScreen === 'public' && (
          <PublicRooms
            socket={socket}
            playerName={playerName}
            playerAvatar={playerAvatar}
            onBack={() => setCurrentScreen('home')}
            onRoomJoined={(room) => {
              setRoomData(room);
              setCurrentScreen('lobby');
            }}
          />
        )}

        {currentScreen === 'ai' && (
          <PlayWithAI
            socket={socket}
            playerName={playerName}
            playerAvatar={playerAvatar}
            onBack={() => setCurrentScreen('home')}
            onRoomJoined={(room) => {
              setRoomData(room);
              setCurrentScreen('lobby');
            }}
          />
        )}

        {currentScreen === 'lobby' && roomData && (
          <Lobby
            socket={socket}
            roomData={roomData}
            onLeave={() => {
              setRoomData(null);
              setCurrentScreen('home');
            }}
            onOpenFriends={() => setShowFriends(true)}
            userData={userData}
          />
        )}

        {currentScreen === 'game' && roomData && (
          <GameRoom
            socket={socket}
            roomData={roomData}
            onReturnHome={() => {
              setRoomData(null);
              setCurrentScreen('home');
            }}
          />
        )}
      </div>

      {/* Modals */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showFriends && (
        <FriendsModal
          socket={socket}
          userData={userData}
          onClose={() => setShowFriends(false)}
          roomCode={roomData?.code}
        />
      )}

      {/* Footer */}
      <footer className="w-full text-center py-4 text-gray-500 text-sm z-10 border-t border-white/10 mt-8">
        MAFIA NIGHT &copy; 2025 — جميع الحقوق محفوظة | اكشف الخائن أو اخدع الجميع
      </footer>
    </div>
  );
}
