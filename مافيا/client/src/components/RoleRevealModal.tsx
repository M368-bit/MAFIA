import React, { useEffect, useState } from 'react';

interface RoleRevealModalProps {
  role: string;
  onComplete: () => void;
}

const ROLES_LIST = [
  { id: 'mafia', name: 'قاتل (MAFIA)', emoji: '🔪', color: 'text-red-500' },
  { id: 'doctor', name: 'طبيب (DOCTOR)', emoji: '💉', color: 'text-blue-400' },
  { id: 'detective', name: 'محقق (DETECTIVE)', emoji: '🔍', color: 'text-green-400' },
  { id: 'citizen', name: 'مواطن (CITIZEN)', emoji: '👤', color: 'text-white' },
];

export default function RoleRevealModal({ role, onComplete }: RoleRevealModalProps) {
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(0);
  const [isFinishedSpinning, setIsFinishedSpinning] = useState(false);

  const getRoleInfo = (r: string) => {
    switch (r) {
      case 'mafia': return { title: 'قاتل (MAFIA)', emoji: '🔪', desc: 'اقتل المواطنين في الليل واخدع الجميع نهاراً.' };
      case 'doctor': return { title: 'طبيب (DOCTOR)', emoji: '💉', desc: 'أنقذ اللاعبين من هجوم المافيا كل ليلة.' };
      case 'detective': return { title: 'محقق (DETECTIVE)', emoji: '🔍', desc: 'حقق في هويات اللاعبين سراً في الليل.' };
      default: return { title: 'مواطن (CITIZEN)', emoji: '👤', desc: 'اكتشف المافيا وصوت لإعدامهم نهاراً.' };
    }
  };

  const finalInfo = getRoleInfo(role);

  useEffect(() => {
    // Play Among Us fanfare sound
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.0);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {}

    // Spin effect for 2.5 seconds
    let step = 0;
    const spinInterval = setInterval(() => {
      setCurrentDisplayIndex((prev) => (prev + 1) % ROLES_LIST.length);
      step++;
      if (step > 15) {
        clearInterval(spinInterval);
        setIsFinishedSpinning(true);
      }
    }, 120);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 5500);

    return () => {
      clearInterval(spinInterval);
      clearTimeout(completeTimer);
    };
  }, [role]);

  const activeRole = isFinishedSpinning ? finalInfo : ROLES_LIST[currentDisplayIndex];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 animate-fade-in transition-colors duration-1000 ${
      isFinishedSpinning
        ? role === 'mafia' ? 'bg-red-950/95' : role === 'doctor' ? 'bg-blue-950/95' : role === 'detective' ? 'bg-green-950/95' : 'bg-gray-950/95'
        : 'bg-darkBg/95'
    }`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md"></div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Among Us Style Spinning Wheel Box */}
        <div className="w-40 h-40 rounded-3xl glass-card border-4 border-accentPurple flex flex-col items-center justify-center text-6xl mb-6 shadow-2xl glow-purple animate-pulse">
          <span>{activeRole.emoji}</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-widest text-white mb-3 uppercase animate-bounce">
          {!isFinishedSpinning ? 'جارٍ السحب...' : role === 'mafia' ? 'أنت القاتل (MAFIA)' : role === 'doctor' ? 'أنت الطبيب' : role === 'detective' ? 'أنت المحقق' : 'أنت مواطن'}
        </h1>

        {isFinishedSpinning && (
          <p className="text-xl md:text-2xl font-bold text-gray-200 max-w-md animate-fade-in">
            {finalInfo.desc}
          </p>
        )}

        <div className="mt-8 text-sm text-gray-400">
          {!isFinishedSpinning ? 'عجلة اختيار الأدوار تدور...' : 'تبدأ المعركة خلال ثوانٍ...'}
        </div>
      </div>
    </div>
  );
}
