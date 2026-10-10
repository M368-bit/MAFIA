import React, { useEffect, useState, useRef } from 'react';
import { audioManager } from '../utils/audioManager';

interface RoleWheelModalProps {
  myRole: string; // 'mafia' | 'doctor' | 'detective' | 'citizen'
  onComplete: () => void;
}

interface Sector {
  roleId: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  desc: string;
}

const SECTORS: Sector[] = [
  {
    roleId: 'mafia',
    name: 'القاتل (MAFIA)',
    emoji: '🔪',
    color: '#ef4444',
    bgColor: '#450a0a',
    desc: 'تتواصل سرًا في الليل وتختار ضحيتك لتصفية المدينة.',
  },
  {
    roleId: 'doctor',
    name: 'الطبيب (DOCTOR)',
    emoji: '🩺',
    color: '#3b82f6',
    bgColor: '#172554',
    desc: 'تحمي لاعبًا واحدًا كل ليلة من هجوم المافيا (يمكنك حماية نفسك مرة واحدة طوال الجيم).',
  },
  {
    roleId: 'detective',
    name: 'المحقق (DETECTIVE)',
    emoji: '🔎',
    color: '#eab308',
    bgColor: '#422006',
    desc: 'تحقق سراً في هوية لاعب واحد كل ليلة لمعرفة إذا كان ينتمي للمافيا.',
  },
  {
    roleId: 'citizen',
    name: 'المواطن (CITIZEN)',
    emoji: '👤',
    color: '#a855f7',
    bgColor: '#3b0764',
    desc: 'تناقش نهاراً وتصوت لإعدام المشتبه بهم لكشف الخونة حمايةً للمدينة.',
  },
];

export default function RoleWheelModal({ myRole, onComplete }: RoleWheelModalProps) {
  const [rotationDegree, setRotationDegree] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const timeoutRef = useRef<any>(null);

  const targetSectorIndex = Math.max(
    0,
    SECTORS.findIndex((s) => s.roleId === myRole)
  );
  const mySector = SECTORS[targetSectorIndex] || SECTORS[3];

  useEffect(() => {
    const totalSectors = SECTORS.length;
    const sectorAngle = 360 / totalSectors;
    const targetCenterAngle = targetSectorIndex * sectorAngle + sectorAngle / 2;

    const baseRotation = (270 - targetCenterAngle + 360) % 360;
    const extraSpins = 360 * 6;
    const finalAngle = extraSpins + baseRotation;

    // Play single spin start sound (no interval ticking to ensure zero lingering sound)
    audioManager.playWheelSpinTick();

    const spinTimer = setTimeout(() => {
      setRotationDegree(finalAngle);
    }, 100);

    const stopTimer = setTimeout(() => {
      setIsSpinning(false);
      setRevealed(true);
      audioManager.playWheelStop();
    }, 4200);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 7500);

    return () => {
      clearTimeout(spinTimer);
      clearTimeout(stopTimer);
      clearTimeout(completeTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [targetSectorIndex, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 animate-fade-in select-none">
      {/* Background ambient lighting */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-40 pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: mySector.color }}
      ></div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto">
        {!revealed ? (
          <>
            <h2 className="text-sm uppercase tracking-widest font-black text-purple-300 mb-2">
              🎡 عجلة توزيع الرتب والمهام
            </h2>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-6 animate-pulse">
              جارٍ سحب وتوزيع الرتب عشوائيًا...
            </h1>

            {/* Wheel Container */}
            <div className="relative w-72 h-72 md:w-88 md:h-88 flex items-center justify-center mb-6">
              {/* Pointer */}
              <div className="absolute -top-5 z-30 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[30px] border-t-yellow-400 drop-shadow-[0_4px_10px_rgba(234,179,8,0.8)] animate-bounce"></div>

              {/* Wheel SVG Circle */}
              <div
                className="w-full h-full rounded-full border-4 border-yellow-400/80 shadow-[0_0_50px_rgba(139,92,246,0.5)] overflow-hidden relative"
                style={{
                  transform: `rotate(${rotationDegree}deg)`,
                  transition: 'transform 4.0s cubic-bezier(0.15, 0.85, 0.2, 1.0)',
                }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {SECTORS.map((sec, idx) => {
                    const total = SECTORS.length;
                    const angle = 360 / total;
                    const startAngle = idx * angle;
                    const endAngle = (idx + 1) * angle;

                    const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);

                    const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                    const midAngle = startAngle + angle / 2;
                    const textRad = (Math.PI * midAngle) / 180;
                    const textX = 50 + 32 * Math.cos(textRad);
                    const textY = 50 + 32 * Math.sin(textRad);

                    return (
                      <g key={sec.roleId}>
                        <path
                          d={pathData}
                          fill={sec.bgColor}
                          stroke="#1e1b4b"
                          strokeWidth="1"
                        />
                        <text
                          x={textX}
                          y={textY}
                          fill="#ffffff"
                          fontSize="7"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={`rotate(${midAngle > 90 && midAngle < 270 ? midAngle + 270 : midAngle + 90}, ${textX}, ${textY})`}
                        >
                          {sec.emoji} {sec.name.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center Hub */}
              <div className="absolute z-20 w-14 h-14 rounded-full bg-darkBg border-4 border-yellow-400 flex items-center justify-center text-xl shadow-2xl glow-purple">
                <span>🎲</span>
              </div>
            </div>
          </>
        ) : (
          /* Big Centered Reveal Message When Wheel Stops */
          <div className="glass-card border-4 p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce backdrop-blur-2xl glow-purple" style={{ borderColor: mySector.color }}>
            <div className="text-7xl mb-4">{mySector.emoji}</div>
            <h2 className="text-xs uppercase font-black tracking-widest text-gray-300 mb-1">
              ✨ تم استقرار العجلة وتحديد رتبتك
            </h2>
            <h1 className="text-3xl md:text-5xl font-black mb-3" style={{ color: mySector.color }}>
              {mySector.name}
            </h1>
            <p className="text-sm md:text-base text-gray-200 font-medium leading-relaxed mb-4">
              {mySector.desc}
            </p>
            <div className="text-xs text-purple-300 bg-purple-950/80 py-2 px-4 rounded-xl border border-purple-800/60">
              🔒 هذه النتيجة سرية وخاصة بك وحدك! تبدأ المعركة الآن...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
