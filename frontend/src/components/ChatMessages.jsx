import React, { useEffect, useRef } from 'react';
import { Scale, User, FileText, ChevronRight, Sparkles } from 'lucide-react';

const SAMPLE_QUESTIONS = [
  'В какой срок арендодатель обязан вернуть обеспечительный платёж при расторжении договора найма?',
  'Какие выплаты положены работнику при сокращении штата по ТК РФ?',
  'Можно ли вернуть технически сложный товар надлежащего качества, купленный онлайн?',
];

export default function ChatMessages({
  messages,
  isTyping,
  sourceRefs = [],
  selectedSource,
  onSelectSource,
  onQuickPrompt,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Находим индекс последнего сообщения ассистента, чтобы прикрепить к нему карточки источников
  let lastAiIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'ai') {
      lastAiIndex = i;
      break;
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.length === 0 && !isTyping && (
          <div className="py-12 text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Новый юридический диалог
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Задайте правовой вопрос — ассистент найдёт релевантные нормы в базе кодексов и покажет точные цитаты из источников.
              </p>
            </div>

            {onQuickPrompt && (
              <div className="grid gap-2.5 max-w-xl mx-auto text-left pt-2">
                {SAMPLE_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onQuickPrompt(q)}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-all text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const msgSources = msg.sources || (idx === lastAiIndex ? sourceRefs : []);
          const showSources = !isUser && idx === lastAiIndex && msgSources.length > 0;

          return (
            <div key={msg.id} className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {/* Аватар ИИ */}
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-blue-500/20">
                  <Scale className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Пузырь сообщения */}
              <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line transition-colors ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-sm shadow-sm shadow-blue-600/15'
                      : 'bg-slate-100 dark:bg-slate-800/85 border border-slate-200/90 dark:border-slate-700/70 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Блок кликабельных источников для ответа ИИ */}
                {showSources && (
                  <div className="pt-1.5">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Использованные нормативные источники (нажмите для проверки):</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msgSources.map((ref) => {
                        const isActive =
                          selectedSource?.id === ref.docId && selectedSource?.article === ref.article;
                        return (
                          <button
                            key={ref.id}
                            type="button"
                            onClick={() => onSelectSource(ref)}
                            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-blue-600/15 border-blue-500 text-blue-700 dark:text-blue-200 shadow-xs'
                                : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {ref.title}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500">·</span>
                            <span className="text-slate-600 dark:text-slate-300">{ref.article}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className={`text-[10px] text-slate-400 dark:text-slate-500 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                  {msg.time}
                </div>
              </div>

              {/* Аватар пользователя */}
              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
              )}
            </div>
          );
        })}

        {/* Индикатор генерации ответа */}
        {isTyping && (
          <div className="flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/85 border border-slate-200 dark:border-slate-700/70 rounded-2xl rounded-bl-sm px-4 py-3 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" />
              </span>
              <span>Поиск по нормативной базе и формирование ответа...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
