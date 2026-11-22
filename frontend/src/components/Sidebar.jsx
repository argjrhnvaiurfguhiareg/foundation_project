import React from 'react';
import {
  Scale,
  Plus,
  MessageSquare,
  FileCheck2,
  BookOpen,
  ShieldAlert,
  Sun,
  Moon,
  Trash2,
} from 'lucide-react';

export default function Sidebar({
  isDarkMode,
  setIsDarkMode,
  chats = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}) {
  return (
    <aside className="w-[270px] flex-shrink-0 bg-slate-100/90 dark:bg-[#090D16] border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between select-none transition-colors duration-200">
      {/* Верхняя часть: Бренд + Кнопка + Текущая сессия */}
      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2.5 px-1.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Право AI
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Юридический ассистент
            </div>
          </div>
        </div>

        {/* Кнопка нового чата */}
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-sm font-medium transition-all shadow-sm shadow-blue-600/20 mb-5 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Новый диалог
          </span>
          <span className="text-[10px] bg-blue-700/80 px-1.5 py-0.5 rounded text-blue-100 font-mono">
            ⌘ K
          </span>
        </button>

        {/* Список диалогов */}
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 mb-2">
          Диалоги ({chats.length})
        </div>
        <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
          {chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group flex items-start justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors border ${
                  isActive
                    ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 shadow-xs'
                    : 'border-transparent hover:bg-white/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <MessageSquare
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-medium truncate ${
                        isActive
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {chat.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {chat.subtitle || 'Юридическая консультация'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => onDeleteChat(chat.id, e)}
                  title="Удалить диалог"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all cursor-pointer flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Нижняя часть: Переключатель темы + Информация о системе */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3 bg-slate-50/70 dark:bg-[#080B12]">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Тема оформления
          </span>
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
            title="Переключить светлую/тёмную тему"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Светлая</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Тёмная</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/60">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>База: Кодексы РФ (2026)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <FileCheck2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Режим: Строгий RAG</span>
          </div>
          <div className="flex items-start gap-2 text-[11px] text-slate-500 pt-1 leading-relaxed">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600/80 dark:text-amber-500/80 flex-shrink-0 mt-0.5" />
            <span>Ответы основаны на загруженных нормативных актах</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
