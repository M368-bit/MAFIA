import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { RoomData } from '../App';
import ChatBox from './ChatBox';
import VoiceChat from './VoiceChat';
import GameOverModal from './GameOverModal';
import RoleWheelModal from './RoleWheelModal';
import StageOverlay from './StageOverlay';
import DetectiveResultModal from './DetectiveResultModal';
import { Moon, Sun, CheckCircle, Vote, SkipForward, ShieldAlert, HeartHandshake, Search } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface GameRoomProps {
  socket: Socket;
  roomData: RoomData;
  onReturnHome: () => void;
}

export default function GameRoom({ socket, roomData, onReturnHome }: GameRoomProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<'VOTE' | 'SKIP' | null>(null);
  const [detectiveResult, setDetectiveResult] = useState<{ targetName?: string; isMafia?: boolean } | null>(null);
  const [actionConfirmed, setActionConfirmed] = useState(false);
  const [hasShownWheel, setHasShownWheel] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(roomData.timeRemaining || 0);

  const showRoleWheel = roomData.gameState === 'ROLE_DISTRIBUTION' && !hasShownWheel;

  const myId = socket.id;
  const me = socket.id ? roomData.players[socket.id] : null;
  const myRole = me?.role || 'citizen';
  const isAlive = me?.isAlive;

  const gameState = roomData.gameState;
  const isNightPhase = ['NIGHT_INTRO', 'NIGHT_MAFIA', 'NIGHT_DOCTOR', 'NIGHT_DETECTIVE', 'NIGHT_RESULT'].includes(gameState);
  const isVotingDecision = gameState === 'VOTING_DECISION';
  const isVotingTargets = gameState === 'VOTING_TARGETS';
  const isDiscussion = gameState === 'DAY_DISCUSSION';
  const isGameOver = gameState === 'GAME_OVER';

  useEffect(() => {
    setTimeRemaining(roomData.timeRemaining);
  }, [roomData.timeRemaining, roomData.gameState]);

  useEffect(() => {
    socket.on('timer_sync', ({ timeRemaining: t }) => {
      setTimeRemaining(t);
    });

    socket.on('detective_result', (res) => {
      setDetectiveResult(res);
    });

    socket.on('action_confirmed', () => {
      setActionConfirmed(true);
    });

    return () => {
      socket.off('timer_sync');
      socket.off('detective_result');
      socket.off('action_confirmed');
    };
  }, [socket]);

  useEffect(() => {
    setActionConfirmed(false);
    setSelectedTarget(null);
    setSelectedDecision(null);
  }, [gameState]);

  // Determine active night role turn
  const isMafiaTurn = isAlive && gameState === 'NIGHT_MAFIA' && myRole === 'mafia';
  const isDoctorTurn = isAlive && gameState === 'NIGHT_DOCTOR' && myRole === 'doctor';
  const isDetectiveTurn = isAlive && gameState === 'NIGHT_DETECTIVE' && myRole === 'detective';

  const isMyActiveNightTurn = isMafiaTurn || isDoctorTurn || isDetectiveTurn;

  const handleNightAction = (targetId: string) => {
    if (!isAlive || actionConfirmed) return;
    setSelectedTarget(targetId);

    if (isMafiaTurn) {
      socket.emit('night_action', { actionType: 'mafia', targetId });
    } else if (isDoctorTurn) {
      if (targetId === myId && me?.doctorSelfHealUsed) {
        alert('يُسمح للطبيب بحماية نفسه مرة واحدة فقط طوال المباراة بأكملها!');
        return;
      }
      socket.emit('night_action', { actionType: 'doctor', targetId });
    } else if (isDetectiveTurn) {
      socket.emit('night_action', { actionType: 'detective', targetId });
    }
  };

  const handleDecisionVote = (choice: 'VOTE' | 'SKIP') => {
    if (!isAlive || selectedDecision) return;
    setSelectedDecision(choice);
    audioManager.playVoteClick();
    socket.emit('cast_decision_vote', { choice });
  };

  const handleTargetVote = (targetId: string) => {
    if (!isAlive || selectedTarget) return;
    setSelectedTarget(targetId);
    audioManager.playVoteClick();
    socket.emit('cast_target_vote', { targetId });
  };

  // Stage Overlay display logic
  const shouldShowStageOverlay =
    gameState === 'NIGHT_INTRO' ||
    gameState === 'NIGHT_RESULT' ||
    gameState === 'VOTING_RESULT' ||
    gameState === 'VOTING_DECISION_RESULT' ||
    (gameState === 'NIGHT_MAFIA' && !isMafiaTurn) ||
    (gameState === 'NIGHT_DOCTOR' && !isDoctorTurn) ||
    (gameState === 'NIGHT_DETECTIVE' && !isDetectiveTurn);

  return (
    <div className={`w-full max-w-5xl flex flex-col gap-6 animate-fade-in relative select-none ${isNightPhase ? 'night-theme' : ''}`}>
      {/* 1. Wheel of Roles Modal */}
      {showRoleWheel && myRole && (
        <RoleWheelModal myRole={myRole} onComplete={() => setHasShownWheel(true)} />
      )}

      {/* 2. Fullscreen Stage Overlay */}
      {shouldShowStageOverlay && (
        <StageOverlay
          stage={gameState}
          timeRemaining={timeRemaining}
          data={
            gameState === 'NIGHT_RESULT'
              ? roomData.nightResultData
              : gameState === 'VOTING_RESULT'
              ? roomData.votingResultData
              : gameState === 'VOTING_DECISION_RESULT'
              ? roomData.votingDecisionData
              : null
          }
        />
      )}

      {/* 3. Detective Private Fullscreen Result */}
      {detectiveResult && (
        <DetectiveResultModal
          targetName={detectiveResult.targetName || 'لاعب'}
          isMafia={!!detectiveResult.isMafia}
          onClose={() => setDetectiveResult(null)}
        />
      )}

      {/* Top Header Bar */}
      <div className={`glass-card p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 transition-all border ${
        isNightPhase
          ? 'bg-indigo-950/40 border-indigo-500/30 glow-purple'
          : isVotingDecision || isVotingTargets
          ? 'bg-red-950/40 border-red-500/30 glow-red'
          : 'border-white/10'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-md ${
            isNightPhase ? 'bg-indigo-900/40 border border-indigo-500/40' : 'bg-yellow-600/20 border border-yellow-500/40'
          }`}>
            {isNightPhase ? <Moon className="w-8 h-8 text-indigo-300" /> : <Sun className="w-8 h-8 text-yellow-400" />}
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-purple-300">مرحلة اللعبة الحالية</span>
            <h2 className="text-xl md:text-2xl font-black">
              {isNightPhase
                ? '🌙 مرحلة الليل (الأدوار السرية)'
                : isDiscussion
                ? '☀️ مرحلة النقاش والتحليل'
                : isVotingDecision
                ? '🗳️ مرحلة اختيار التصويت أو التخطي'
                : isVotingTargets
                ? '⚖️ مرحلة التصويت على الإعدام'
                : 'انتهت المباراة'}
            </h2>
          </div>
        </div>

        {/* Timer & Role Badge */}
        <div className="flex items-center gap-3">
          <div className="glass-card border border-white/10 px-5 py-2.5 rounded-2xl text-center">
            <span className="block text-[10px] text-gray-400">الوقت المتبقي</span>
            <span className="text-xl font-black text-accentPurple font-mono">{timeRemaining}s</span>
          </div>

          <div className="glass-card border border-white/10 px-5 py-2.5 rounded-2xl text-center">
            <span className="block text-[10px] text-gray-400">دورك السري</span>
            <span className="text-sm font-bold text-yellow-400">
              {myRole === 'mafia' ? 'قاتل 🔪' : myRole === 'detective' ? 'محقق 🔎' : myRole === 'doctor' ? 'طبيب 🩺' : 'مواطن 👤'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Players & Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Player Cards & Active Action Area */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl shadow-xl flex flex-col border border-white/10 relative">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span>قائمة اللاعبين الأحياء الأهداف</span>
              {!isAlive && <span className="text-xs bg-red-950/60 text-red-400 px-2.5 py-1 rounded-xl border border-red-900/60">أنت ميت 💀</span>}
            </h3>
          </div>

          {/* Voting Decision Interactive Cards (Vote vs Skip) */}
          {isVotingDecision && isAlive && (
            <div className="my-4 p-5 glass-card border border-purple-500/40 rounded-3xl text-center space-y-4 bg-purple-950/20 glow-purple">
              <h3 className="text-lg font-black text-purple-200">
                🗳️ اختر قرارك لهذه الجولة: هل تريد إجراء تصويت أم تخطي الجولة؟
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => handleDecisionVote('VOTE')}
                  disabled={!!selectedDecision}
                  className={`p-5 rounded-2xl font-black text-base flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 ${
                    selectedDecision === 'VOTE'
                      ? 'bg-red-600 border-red-400 text-white shadow-xl glow-red scale-105'
                      : 'bg-white/5 hover:bg-white/10 border-white/20 text-red-300'
                  }`}
                >
                  <Vote className="w-8 h-8 text-red-400" />
                  <span>إجراء تصويت (VOTE)</span>
                  <span className="text-xs text-gray-300">
                    أصوات المختارين: {roomData.votingDecisionData?.voteCount || 0}
                  </span>
                </button>

                <button
                  onClick={() => handleDecisionVote('SKIP')}
                  disabled={!!selectedDecision}
                  className={`p-5 rounded-2xl font-black text-base flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 ${
                    selectedDecision === 'SKIP'
                      ? 'bg-yellow-500 border-yellow-300 text-black shadow-xl glow-purple scale-105'
                      : 'bg-white/5 hover:bg-white/10 border-white/20 text-yellow-300'
                  }`}
                >
                  <SkipForward className="w-8 h-8 text-yellow-400" />
                  <span>تخطي الجولة (SKIP)</span>
                  <span className="text-xs text-gray-300">
                    أصوات المختارين: {roomData.votingDecisionData?.skipCount || 0}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Player Cards List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
            {Object.values(roomData.players).map((p: any) => {
              const isSelected = selectedTarget === p.id;
              const canAction = isAlive && p.isAlive && !actionConfirmed && (
                (isNightPhase && isMyActiveNightTurn && p.id !== myId) ||
                (isVotingTargets && p.id !== myId)
              );

              // Check vote indicator on target
              const voteCountOnTarget = Object.values(roomData.targetVotes || {}).filter(v => v === p.id).length;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (canAction) {
                      if (isNightPhase) handleNightAction(p.id);
                      if (isVotingTargets) handleTargetVote(p.id);
                    }
                  }}
                  className={`glass-card border p-3.5 rounded-2xl flex items-center justify-between transition-all backdrop-blur-md ${
                    !p.isAlive
                      ? 'opacity-40 border-gray-800 bg-gray-900/40'
                      : isSelected
                      ? 'border-accentPurple bg-accentPurple/20 glow-purple shadow-lg scale-[1.02]'
                      : canAction
                      ? 'border-white/20 hover:border-accentPurple cursor-pointer hover:bg-white/10'
                      : 'border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
                      {p.avatar}
                    </span>
                    <div>
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.id === roomData.hostId && <span className="text-[10px] text-yellow-400">⭐</span>}
                      </div>
                      <span className="text-xs text-gray-400">
                        {p.isAlive ? 'حي وبصحة جيدة' : 'تم القضاء عليه 💀'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Votes Badge on player (Among Us Style) */}
                    {isVotingTargets && voteCountOnTarget > 0 && (
                      <span className="bg-red-950/80 text-red-400 border border-red-500/50 text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                        🗳️ {voteCountOnTarget}
                      </span>
                    )}

                    {canAction && (
                      <span className="text-xs bg-accentPurple/30 border border-accentPurple/60 text-purple-200 px-3 py-1 rounded-xl font-bold">
                        {isNightPhase ? 'اختيار' : 'تصويت'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Night Turn Banner */}
          {isNightPhase && isMyActiveNightTurn && (
            <div className="mt-4 p-4 bg-indigo-950/50 border border-indigo-500/40 rounded-2xl text-center text-sm backdrop-blur-md shadow-xl glow-purple">
              {actionConfirmed ? (
                <span className="text-green-400 font-bold flex items-center justify-center gap-2 text-base">
                  <CheckCircle className="w-5 h-5" /> تم تسجيل قرارك بنجاح!
                </span>
              ) : (
                <div className="flex items-center justify-center gap-2 text-indigo-200 font-bold">
                  {myRole === 'mafia' && (
                    <>
                      <ShieldAlert className="w-5 h-5 text-red-400" />
                      <span>اختر هدفك للتخلص منه كقاتل (المافيا).</span>
                    </>
                  )}
                  {myRole === 'doctor' && (
                    <>
                      <HeartHandshake className="w-5 h-5 text-blue-400" />
                      <span>اختر الشخص الذي تريد حمايته من المافيا (يمكنك حماية نفسك مرة واحدة طوال الجيم).</span>
                    </>
                  )}
                  {myRole === 'detective' && (
                    <>
                      <Search className="w-5 h-5 text-yellow-400" />
                      <span>اختر شخصاً للتحقيق في هويته لمعرفة ما إذا كان ينتمي للمافيا.</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Chat & Voice */}
        <div className="flex flex-col gap-4">
          <ChatBox socket={socket} myRole={myRole || null} isAlive={!!isAlive} />
          <VoiceChat socket={socket} roomData={roomData} />
        </div>
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <GameOverModal
          winner={roomData.winner}
          roomData={roomData}
          socketId={socket.id!}
          onReturnHome={onReturnHome}
        />
      )}
    </div>
  );
}
