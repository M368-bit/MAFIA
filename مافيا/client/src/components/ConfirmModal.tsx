import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card border border-white/20 w-full max-w-md rounded-3xl shadow-2xl p-6 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-neonRed/25 border border-neonRed flex items-center justify-center text-neonRed mb-4 glow-red backdrop-blur-md">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
        <p className="text-gray-300 text-sm mb-6">{message}</p>
        <div className="w-full flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 glass-card hover:bg-white/10 rounded-2xl font-bold text-sm border border-white/15 text-gray-300 transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-neonRed hover:bg-red-600 rounded-2xl font-bold text-sm text-white shadow-lg glow-red transition-all"
          >
            تأكيد المغادرة
          </button>
        </div>
      </div>
    </div>
  );
}
