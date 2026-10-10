import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { User, Lock, LogIn, UserPlus } from 'lucide-react';

interface AuthModalProps {
  socket: Socket;
  onAuthenticated: (user: any) => void;
}

const AVATARS = ['🕵️‍♂️', '🦹‍♂️', '🧛‍♂️', '🦊', '💀', '🤖', '👑', '🕶️', '🧙‍♂️', '🦁'];

export default function AuthModal({ socket, onAuthenticated }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('🕵️‍♂️');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('الرجاء إدخال اسم المستخدم وكلمة المرور!');
      return;
    }

    setLoading(true);
    setError(null);

    const eventName = isLogin ? 'login' : 'signup';
    const payload = isLogin ? { username, password } : { username, password, avatar };

    let responded = false;
    const timer = setTimeout(() => {
      if (!responded) {
        setLoading(false);
        setError('انتهت مهلة الاتصال بالخادم. تأكد من تشغيل الخادم (npm start) في مجلد server!');
      }
    }, 5000);

    socket.emit(eventName, payload, (res: { success: boolean; user?: any; error?: string }) => {
      responded = true;
      clearTimeout(timer);
      setLoading(false);
      if (res && res.success && res.user) {
        onAuthenticated(res.user);
      } else {
        setError(res?.error || 'حدث خطأ ما في الخادم');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card border border-white/20 w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col items-center">
        {/* Logo / Header */}
        <div className="w-20 h-20 bg-accentPurple/20 border-2 border-accentPurple/60 rounded-2xl flex items-center justify-center text-4xl mb-4 glow-purple backdrop-blur-md">
          🦹‍♂️
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-accentPurple mb-1">
          MAFIA NIGHT
        </h2>
        <p className="text-purple-300 text-sm mb-6">
          {isLogin ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد ومعرف خاص بك'}
        </p>

        {/* Tab Switcher */}
        <div className="w-full flex bg-white/5 p-1 rounded-2xl border border-white/10 mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              isLogin ? 'bg-accentPurple text-white shadow glow-purple' : 'text-gray-400 hover:text-white'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              !isLogin ? 'bg-accentPurple text-white shadow glow-purple' : 'text-gray-400 hover:text-white'
            }`}
          >
            حساب جديد
          </button>
        </div>

        {error && (
          <div className="w-full bg-neonRed/20 border border-neonRed text-neonRed p-3 rounded-2xl text-center text-sm mb-4 backdrop-blur-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1 flex items-center gap-2">
              <User className="w-4 h-4 text-accentPurple" />
              <span>اسم المستخدم</span>
            </label>
            <input
              type="text"
              maxLength={15}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="اكتب اسم المستخدم..."
              className="w-full glass-input rounded-2xl px-4 py-3 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-accentPurple" />
              <span>كلمة المرور</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full glass-input rounded-2xl px-4 py-3 text-white focus:outline-none"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">اختر صورتك الرمزية</label>
              <div className="flex flex-wrap gap-2 justify-center">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                      avatar === av
                        ? 'bg-accentPurple border-2 border-white scale-110 glow-purple'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-accentPurple to-purple-700 hover:from-purple-600 hover:to-accentPurple rounded-2xl font-bold text-lg shadow-lg glow-purple transition-transform active:scale-95 disabled:opacity-50 mt-4 border border-purple-400/30 flex items-center justify-center gap-2"
          >
            {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            <span>{loading ? 'جاري المعالجة...' : isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
