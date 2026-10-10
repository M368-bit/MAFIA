import React from 'react';
import { X, ShieldAlert, Moon, Sun } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export default function RulesModal({ onClose }: RulesModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card border border-white/15 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-accentPurple" />
            <span>قواعد لعبة مافيا نايت والأدوار</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/5 text-gray-400 hover:text-white transition-colors border border-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-gray-300 text-sm md:text-base">
          {/* Overview */}
          <div className="glass-card p-4 rounded-2xl border border-white/10">
            <h3 className="font-bold text-accentPurple text-lg mb-2">🎯 هدف اللعبة</h3>
            <p>
              تنقسم الأطراف إلى فريقين: <strong>المواطنون</strong> (وفيهم المحقق والطبيب) و<strong>المافيا</strong>.
              المافيا تحاول قتل جميع المواطنين سرًا، بينما يحاول المواطنون اكتشاف أفراد المافيا والتخلص منهم بالتصويت نهارًا.
            </p>
          </div>

          {/* Roles */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-white">🎭 الأدوار الأساسية</h3>

            <div className="glass-card border border-white/10 p-4 rounded-2xl flex items-start gap-3">
              <span className="text-3xl">🦹‍♂️</span>
              <div>
                <h4 className="font-bold text-accentPurple text-base">المافيا (Mafia)</h4>
                <p className="text-sm text-gray-300 mt-1">
                  يتعرفون على بعضهم البعض في الليل، ويختارون ضحية لاستهدافها وقتلها كل ليلة. هدفهم السيطرة على المدينة.
                </p>
              </div>
            </div>

            <div className="glass-card border border-white/10 p-4 rounded-2xl flex items-start gap-3">
              <span className="text-3xl">👤</span>
              <div>
                <h4 className="font-bold text-blue-400 text-base">المواطن (Citizen)</h4>
                <p className="text-sm text-gray-300 mt-1">
                  لا يمتلك قدرة خاصة، لكن صوته ومناقشاته النهارية هي السلاح الأقوى لكشف الخونة والتصويت لإخراجهم.
                </p>
              </div>
            </div>

            <div className="glass-card border border-white/10 p-4 rounded-2xl flex items-start gap-3">
              <span className="text-3xl">🔍</span>
              <div>
                <h4 className="font-bold text-yellow-400 text-base">المحقق (Detective)</h4>
                <p className="text-sm text-gray-300 mt-1">
                  يستطيع كل ليلة التحقيق في هوية لاعب واحد لمعرفة ما إذا كان من أفراد المافيا أم لا بشكل سري.
                </p>
              </div>
            </div>

            <div className="glass-card border border-white/10 p-4 rounded-2xl flex items-start gap-3">
              <span className="text-3xl">💉</span>
              <div>
                <h4 className="font-bold text-green-400 text-base">الطبيب (Doctor)</h4>
                <p className="text-sm text-gray-300 mt-1">
                  يختار لاعبًا كل ليلة لمحاولة إنقاذه من هجوم المافيا المحتمل.
                </p>
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="glass-card p-4 rounded-2xl border border-white/10 space-y-3">
            <h3 className="font-bold text-accentPurple text-lg">⏳ مراحل اللعبة</h3>
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <p><strong>مرحلة الليل:</strong> تنام المدينة، وتقوم المافيا والمحقق والطبيب بتنفيذ قدراتهم السرية.</p>
            </div>
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <p><strong>مرحلة النهار والتصويت:</strong> تعلن أحداث الليل، يناقش اللاعبون المشتبه بهم، ثم يصوتون لإعدام المشتبه به.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-accentPurple hover:bg-purple-600 rounded-2xl font-bold transition-transform active:scale-95 shadow-lg glow-purple"
          >
            فهمت القواعد
          </button>
        </div>
      </div>
    </div>
  );
}
