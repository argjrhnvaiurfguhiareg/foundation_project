import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatHeader from './components/ChatHeader';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';
import SourceViewer from './components/SourceViewer';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sourceRefs, setSourceRefs] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  const activeChat = chats.find((c) => c.id === activeChatId) || {
    title: 'Новый диалог',
    subtitle: 'Юридическая консультация · Контекст: ГК РФ и ТК РФ',
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const loadChatMessages = useCallback(async (chatId) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveChatId(data.id);
      setMessages(data.messages || []);
      setSelectedSource(null);

      // Подтягиваем источники из последнего ответа ассистента
      const lastAiMsg = [...(data.messages || [])].reverse().find((m) => m.role === 'ai');
      setSourceRefs(lastAiMsg?.sources || []);
    } catch (err) {
      console.error('Ошибка загрузки сообщений чата:', err);
    }
  }, []);

  const handleNewChat = useCallback(async () => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Новый диалог',
          subtitle: 'Юридическая консультация · Контекст: ГК РФ и ТК РФ',
        }),
      });
      if (!res.ok) throw new Error('Не удалось создать диалог');
      const created = await res.json();

      setChats((prev) => [created, ...prev]);
      setActiveChatId(created.id);
      setMessages([]);
      setSourceRefs([]);
      setSelectedSource(null);
    } catch (err) {
      console.error('Ошибка создания нового чата:', err);
    }
  }, []);

  // Первичная инициализация списка чатов
  useEffect(() => {
    let isMounted = true;
    async function initChats() {
      try {
        const res = await fetch('/api/chats');
        if (!res.ok) return;
        const data = await res.json();
        const existingChats = data.chats || [];

        if (!isMounted) return;

        if (existingChats.length > 0) {
          setChats(existingChats);
          await loadChatMessages(existingChats[0].id);
        } else {
          await handleNewChat();
        }
      } catch (err) {
        console.error('Ошибка инициализации чатов:', err);
      }
    }
    initChats();
    return () => {
      isMounted = false;
    };
  }, [loadChatMessages, handleNewChat]);

  // Горячая клавиша Cmd+K / Ctrl+K для создания нового диалога
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNewChat]);

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (!res.ok) return;

      const updatedChats = chats.filter((c) => c.id !== chatId);
      setChats(updatedChats);

      if (activeChatId === chatId) {
        if (updatedChats.length > 0) {
          await loadChatMessages(updatedChats[0].id);
        } else {
          await handleNewChat();
        }
      }
    } catch (err) {
      console.error('Ошибка удаления чата:', err);
    }
  };

  const handleSelectSource = async (sourceRef) => {
    setSelectedSource({
      id: sourceRef.docId,
      doc_name: sourceRef.title,
      title: sourceRef.article,
      date: '2026',
      edition: 'Действующая редакция',
      highlightHeader: sourceRef.header || `${sourceRef.title} > ${sourceRef.article}`,
      sections: [{ header: sourceRef.article, text: 'Загрузка текста документа из базы знаний...' }],
    });

    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(sourceRef.docId)}`);
      if (!res.ok) throw new Error('Документ не найден');
      const doc = await res.json();
      setSelectedSource({
        ...doc,
        highlightHeader: sourceRef.header || `${sourceRef.title} > ${sourceRef.article}`,
      });
    } catch {
      setSelectedSource((prev) =>
        prev
          ? {
              ...prev,
              sections: [
                {
                  header: sourceRef.article,
                  text: sourceRef.quote || 'Не удалось загрузить полный текст документа.',
                },
              ],
            }
          : null
      );
    }
  };


  const handleSend = async (text) => {
    const nowTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: Date.now(), role: 'user', text, time: nowTime };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: activeChatId,
          message: text,
          history: nextMessages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Ошибка сервера (${res.status})`);
      }

      const data = await res.json();
      const newSources = data.sources || [];

      setActiveChatId(data.chat_id);
      setChats((prev) => {
        const exists = prev.some((c) => c.id === data.chat_id);
        if (!exists) {
          return [
            { id: data.chat_id, title: data.title, subtitle: 'Юридическая консультация' },
            ...prev,
          ];
        }
        return prev.map((c) => (c.id === data.chat_id ? { ...c, title: data.title } : c));
      });

      setSourceRefs(newSources);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: data.answer,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          sources: newSources,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: `Не удалось получить ответ от сервера: ${error.message}. Убедитесь, что бэкенд запущен и индекс загружен.`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      <Sidebar
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={loadChatMessages}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0D131F] relative transition-colors duration-200">
        <ChatHeader title={activeChat.title} subtitle={activeChat.subtitle} />
        <ChatMessages
          messages={messages}
          isTyping={isTyping}
          sourceRefs={sourceRefs}
          selectedSource={selectedSource}
          onSelectSource={handleSelectSource}
          onQuickPrompt={handleSend}
        />
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </main>

      {selectedSource && (
        <SourceViewer
          document={selectedSource}
          highlightHeader={selectedSource.highlightHeader}
          onClose={() => setSelectedSource(null)}
        />
      )}


    </div>
  );
}

