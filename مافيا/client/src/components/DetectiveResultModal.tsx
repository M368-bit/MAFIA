import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface DetectiveResultModalProps {
  targetName: string;
  isMafia: boolean;
  onClose: () => void;
}

export default function DetectiveResultModal({ targetName, isMafia, onClose }: DetectiveResultModalProps) {
  useEffect(() => {
    if (isMafia) {
      audioManager.playDetectiveCheck();
    } else {
      audioManager.playDetectiveCross();
    }

    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isMafia]);

  return (
    <div className={`fixed inset-0 z-50 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in ${
      isMafia ? 'bg-red-950/95' : 'bg-emerald-950/95'
    } select-none`}>
      <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto">
        {/* Symbol */}
        <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center mb-6 shadow-2xl animate-bounce ${
          isMafia
            ? 'bg-red-900/60 border-red-500 text-red-400 glow-red'
            : 'bg-emerald-900/60 border-emerald-500 text-emerald-400'
        }`}>
          {isMafia ? <Check className="w-20 h-20 stroke-[3]" /> : <X className="w-20 h-20 stroke-[3]" />}
        </div>

        {/* Title */}
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-300 mb-2">
          🔍 نتيجة التحقيق السري للمحقق
        </h2>

        <h1 className={`text-3xl md:text-5xl font-black mb-4 ${
          isMafia ? 'text-red-400 glow-red' : 'text-emerald-300'
        }`}>
          {isMafia ? 'هذا اللاعب من المافيا!' : 'هذا اللاعب ليس من المافيا.'}
        </h1>

        <p className="text-gray-200 text-lg font-bold bg-white/10 px-6 py-3 rounded-2xl border border-white/10 mb-6">
          اللاعب المستهدف: <span className="text-yellow-400 font-black">{targetName}</span>
        </p>

        <p className="text-xs text-gray-400 max-w-md mb-8">
          🔒 هذه المعلمومة سرية وخاصة بك بصفتك المحقق. ينتهي العرض تلقائيًا...
        </p>

        <button
          onClick={onClose}
          className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-white border border-white/20 transition-all active:scale-95"
        >
          فهمت ذلك (إغلاق)
        </button>
      </div>
    </div>
  );
}
