import React, { useEffect } from 'react';
import { Moon, Sun, ShieldAlert, HeartHandshake, Search, Skull, MessageSquare, Vote, CheckCircle2 } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface StageOverlayProps {
  stage: string; // 'NIGHT_INTRO' | 'NIGHT_MAFIA' | 'NIGHT_DOCTOR' | 'NIGHT_DETECTIVE' | 'NIGHT_RESULT' | 'DAY_DISCUSSION' | 'VOTING_DECISION' | 'VOTING_TARGETS' | 'VOTING_RESULT';
  timeRemaining: number;
  data?: any; // Night result details, killed player, etc.
}

export default function StageOverlay({ stage, timeRemaining, data }: StageOverlayProps) {
  useEffect(() => {
    switch (stage) {
      case 'NIGHT_INTRO':
        audioManager.playNightIntro();
        break;
      case 'NIGHT_MAFIA':
      case 'NIGHT_DOCTOR':
      case 'NIGHT_DETECTIVE':
        audioManager.playWaitPulse();
        break;
      case 'NIGHT_RESULT':
        if (data?.killedPlayerName) {
          audioManager.playKillSound();
        } else {
          audioManager.playPeaceSound();
        }
        break;
      case 'DAY_DISCUSSION':
        audioManager.playPeaceSound();
        break;
      case 'VOTING_RESULT':
        if (data?.eliminatedName) {
          audioManager.playExecutionSound();
        } else {
          audioManager.playPeaceSound();
        }
        break;
      default:
        break;
    }
  }, [stage]);

  const renderStageContent = () => {
    switch (stage) {
      case 'NIGHT_INTRO':
        return {
          icon: <Moon className="w-20 h-20 text-indigo-400 animate-pulse" />,
          title: 'بدأ الليل في المدينة...',
          subtitle: 'يحل الظلام على شوارع المدينة، ينام الجميع وتبدأ التحركات السرية.',
          bgColor: 'bg-indigo-950/95',
          borderColor: 'border-indigo-500/50',
          textColor: 'text-indigo-400',
        };

      case 'NIGHT_MAFIA':
        return {
          icon: <ShieldAlert className="w-20 h-20 text-red-500 animate-bounce" />,
          title: 'بدأ القاتل مهمته... 🔪',
          subtitle: 'تستعد المافيا لاختيار الضحية التالية في صمت الليل.',
          bgColor: 'bg-red-950/95',
          borderColor: 'border-red-500/50',
          textColor: 'text-red-500',
        };

      case 'NIGHT_DOCTOR':
        return {
          icon: <HeartHandshake className="w-20 h-20 text-blue-400 animate-pulse" />,
          title: 'بدأ الطبيب مهمة الشفاء... 🩺',
          subtitle: 'يبحث الطبيب عن الشخص المستهدف لحمايته وإنقاذ حياته.',
          bgColor: 'bg-blue-950/95',
          borderColor: 'border-blue-500/50',
          textColor: 'text-blue-400',
        };

      case 'NIGHT_DETECTIVE':
        return {
          icon: <Search className="w-20 h-20 text-yellow-400 animate-spin" />,
          title: 'بدأ المحقق التحقيق... 🔎',
          subtitle: 'يجري المحقق تحرياته السرية لكشف هويات المشتبه بهم.',
          bgColor: 'bg-yellow-950/95',
          borderColor: 'border-yellow-500/50',
          textColor: 'text-yellow-400',
        };

      case 'NIGHT_RESULT':
        const isKilled = !!data?.killedPlayerName;
        return {
          icon: isKilled ? <Skull className="w-20 h-20 text-red-500 animate-bounce" /> : <CheckCircle2 className="w-20 h-20 text-green-400 animate-pulse" />,
          title: isKilled ? `تم قتل: ${data.killedPlayerName}` : 'لم يُقتل أحد هذه الليلة!',
          subtitle: isKilled
            ? 'غادرنا أحد سكان المدينة غدرًا على يد المافيا...'
            : 'استطاع الطبيب حماية المستهدف أو لم تهاجم المافيا أحدًا!',
          bgColor: isKilled ? 'bg-red-950/95' : 'bg-green-950/95',
          borderColor: isKilled ? 'border-red-500/50' : 'border-green-500/50',
          textColor: isKilled ? 'text-red-400' : 'text-green-400',
        };

      case 'DAY_DISCUSSION':
        return {
          icon: <Sun className="w-20 h-20 text-yellow-400 animate-pulse" />,
          title: 'أشرقت الشمس... بدأ النهار! ☀️',
          subtitle: 'استيقظ أهل المدينة لمناقشة أحداث الليل والبحث عن القاتل.',
          bgColor: 'bg-amber-950/95',
          borderColor: 'border-yellow-500/50',
          textColor: 'text-yellow-400',
        };

      case 'VOTING_DECISION':
        return {
          icon: <Vote className="w-20 h-20 text-purple-400 animate-bounce" />,
          title: 'مرحلة قرار التصويت 🗳️',
          subtitle: 'اختر هل ترغب في إجراء تصويت لإعدام أحد اللاعبين أم تخطي الجولة.',
          bgColor: 'bg-purple-950/95',
          borderColor: 'border-purple-500/50',
          textColor: 'text-purple-300',
        };

      case 'VOTING_TARGETS':
        return {
          icon: <Vote className="w-20 h-20 text-red-500 animate-pulse" />,
          title: 'بدأ التصويت على الإعدام ⚖️',
          subtitle: 'اختر الشخص المشتبه به للتصويت على إخراجه من اللعبة.',
          bgColor: 'bg-red-950/95',
          borderColor: 'border-red-500/50',
          textColor: 'text-red-400',
        };

      case 'VOTING_RESULT':
        const eliminated = data?.eliminatedName;
        const wasMafia = data?.isMafia;
        return {
          icon: eliminated ? <Skull className="w-20 h-20 text-red-500" /> : <MessageSquare className="w-20 h-20 text-blue-400" />,
          title: eliminated
            ? wasMafia
              ? `تم إخراج [${eliminated}] — كان من المافيا! 🔥`
              : `تم إخراج [${eliminated}] — ليس من المافيا.`
            : 'لم يخرج أحد من التصويت (تعادل أو تخطي)!',
          subtitle: eliminated
            ? 'قررت المحكمة الشعبية إخراجه من المدينة.'
            : 'انتهت الجولة دون الاتفاق على إعدام أحد.',
          bgColor: wasMafia ? 'bg-red-950/95' : 'bg-gray-950/95',
          borderColor: wasMafia ? 'border-red-500/50' : 'border-gray-500/50',
          textColor: wasMafia ? 'text-red-400' : 'text-gray-200',
        };

      default:
        return {
          icon: <Moon className="w-20 h-20 text-purple-400" />,
          title: 'جاري الانتقال...',
          subtitle: 'الرجاء الانتظار...',
          bgColor: 'bg-black/95',
          borderColor: 'border-white/10',
          textColor: 'text-white',
        };
    }
  };

  const info = renderStageContent();

  return (
    <div className={`fixed inset-0 z-50 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in ${info.bgColor} select-none`}>
      {/* Background glow circle */}
      <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 pointer-events-none bg-current"></div>

      <div className="relative z-10 flex flex-col items-center max-w-xl mx-auto">
        <div className="mb-6">{info.icon}</div>

        <h1 className={`text-3xl md:text-5xl font-black mb-4 tracking-wide ${info.textColor} drop-shadow-lg`}>
          {info.title}
        </h1>

        <p className="text-gray-300 text-base md:text-xl font-medium leading-relaxed max-w-lg mb-8">
          {info.subtitle}
        </p>

        {timeRemaining > 0 && (
          <div className="glass-card px-6 py-2.5 rounded-2xl border border-white/20 text-center shadow-xl">
            <span className="text-xs text-gray-400 block">الانتقال التلقائي خلال</span>
            <span className="text-2xl font-black text-white font-mono">{timeRemaining} ثانية</span>
          </div>
        )}
      </div>
    </div>
  );
}
