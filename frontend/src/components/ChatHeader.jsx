import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function ChatHeader({ title, subtitle }) {
  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 px-6 flex items-center justify-between flex-shrink-0 bg-white/80 dark:bg-[#0D131F]/80 backdrop-blur-md transition-colors duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
          {title || 'Новый диалог'}
        </h1>
        <span className="hidden sm:inline-block text-xs text-slate-300 dark:text-slate-600">•</span>
        <span className="hidden sm:inline-block text-xs text-slate-500 dark:text-slate-400 truncate">
          {subtitle || 'Юридическая консультация · Контекст: ГК РФ и ТК РФ'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full flex-shrink-0">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Проверка по источникам активна</span>
      </div>
    </header>
  );
}
