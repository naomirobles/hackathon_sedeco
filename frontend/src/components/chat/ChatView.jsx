/**
 * components/chat/ChatView.jsx
 * ─────────────────────────────
 * Panel lateral deslizable (right-drawer) que contiene:
 *   - Sidebar izquierdo: catálogo dinámico de chats
 *   - Área derecha: ventana de conversación con el chatbot
 *
 * ── PARA AÑADIR UN NUEVO CHAT ────────────────────────────────────────────────
 * Solo agrega un objeto al array CHAT_CATALOG de abajo.
 * No es necesario modificar ningún otro código del componente.
 * ────────────────────────────────────────────────────────────────────────────
 */

import React, {
  useState, useRef, useEffect, useCallback,
} from 'react';
import { sendChatMessage, clearSession } from '../../services/chatService';

// ─── Catálogo dinámico de chats ───────────────────────────────────────────────
// Cada objeto representa un asistente especializado.
// available: false → muestra como "Próximamente" (no clickeable).
const CHAT_CATALOG = [
  {
    id: 'viabilidad_negocio',
    title: 'Asesor de Negocios',
    description: 'Permisos y trámites para abrir tu negocio en CDMX',
    emoji: '🏪',
    available: true,
  },
  {
    id: 'logistica_rutas',
    title: 'Logística y Rutas',
    description: 'Calcula rutas de entrega y busca servicios cercanos',
    emoji: '🚚',
    available: true,
  },
  {
    id: 'seguridad_vial',
    title: 'Seguridad Vial',
    description: 'Infracciones, permisos y licencias de conducir',
    emoji: '🚦',
    available: false,
  },
  {
    id: 'servicios_sociales',
    title: 'Servicios Sociales',
    description: 'Programas y apoyos del Gobierno de la CDMX',
    emoji: '🤝',
    available: false,
  },
];

// ─── Colores (alineados con el design system del proyecto) ─────────────────────
const C = {
  guinda:      '#9F2241',
  guindaDark:  '#6B1C3A',
  guindaLight: 'rgba(159,34,65,0.08)',
  white:       '#ffffff',
  gray100:     '#f5f5f5',
  gray200:     '#eeeeee',
  gray600:     '#666666',
  gray800:     '#333333',
  userBubble:  '#9F2241',
  botBubble:   '#f5f5f5',
};

// ─── Utilidad: convertir markdown básico a elementos React ────────────────────
function MarkdownText({ text }) {
  const lines = text.split('\n');

  return (
    <div style={{ lineHeight: 1.6 }}>
      {lines.map((line, i) => {
        // Headers ##
        if (/^#{1,3}\s+/.test(line)) {
          const content = line.replace(/^#+\s+/, '');
          return (
            <p key={i} style={{ margin: '8px 0 4px', fontWeight: 700,
              color: C.guindaDark, fontSize: 13 }}>
              {inlineBold(content)}
            </p>
          );
        }
        // Bullet list
        if (/^[-*•]\s+/.test(line)) {
          const content = line.replace(/^[-*•]\s+/, '');
          return (
            <div key={i} style={{ display: 'flex', gap: 6, margin: '3px 0', paddingLeft: 4 }}>
              <span style={{ color: C.guinda, flexShrink: 0, marginTop: 1 }}>▸</span>
              <span>{inlineBold(content)}</span>
            </div>
          );
        }
        // Numbered list  1. 2. etc
        if (/^\d+\.\s+/.test(line)) {
          const num     = line.match(/^(\d+)\./)[1];
          const content = line.replace(/^\d+\.\s+/, '');
          return (
            <div key={i} style={{ display: 'flex', gap: 6, margin: '3px 0', paddingLeft: 4 }}>
              <span style={{ color: C.guinda, fontWeight: 700, flexShrink: 0, minWidth: 18 }}>
                {num}.
              </span>
              <span>{inlineBold(content)}</span>
            </div>
          );
        }
        // Línea vacía → separador
        if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
        // Párrafo normal
        return <p key={i} style={{ margin: '3px 0' }}>{inlineBold(line)}</p>;
      })}
    </div>
  );
}

/** Convierte **texto** → <strong>texto</strong> inline */
function inlineBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: C.guindaDark }}>{p}</strong>
      : p
  );
}

// ─── Componente: burbuja de mensaje ──────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
      alignItems: 'flex-end',
      gap: 8,
    }}>
      {/* Avatar bot */}
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          backgroundColor: C.guinda,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>
          🤖
        </div>
      )}

      <div style={{
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        backgroundColor: isUser ? C.userBubble : C.botBubble,
        color: isUser ? C.white : C.gray800,
        fontSize: 13,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        {isUser
          ? <span>{msg.content}</span>
          : <MarkdownText text={msg.content} />
        }

        {/* Renderizado de Mapa Folium si existe */}
        {!isUser && msg.mapHtml && (
          <div style={{ 
            marginTop: 12, 
            width: '100%', 
            height: 350, 
            borderRadius: 8, 
            overflow: 'hidden',
            border: `1px solid ${C.gray200}`
          }}>
            <iframe
              title="Mapa de Ruta"
              srcDoc={msg.mapHtml}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        )}

        <div style={{
          fontSize: 10, color: isUser ? 'rgba(255,255,255,0.6)' : '#aaa',
          marginTop: 4, textAlign: 'right',
        }}>
          {msg.time}
        </div>
      </div>

      {/* Avatar usuario */}
      {isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          backgroundColor: '#ddd',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>
          👤
        </div>
      )}
    </div>
  );
}

// ─── Componente: indicador "escribiendo…" ────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        backgroundColor: C.guinda,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
      }}>🤖</div>
      <div style={{
        padding: '10px 16px', borderRadius: '4px 18px 18px 18px',
        backgroundColor: C.botBubble,
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            backgroundColor: C.guinda,
            animation: `chatDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Componente: sidebar con catálogo de chats ────────────────────────────────
function ChatSidebar({ activeChatId, onSelectChat, onClose }) {
  return (
    <div style={{
      width: 210,
      flexShrink: 0,
      backgroundColor: C.guindaDark,
      display: 'flex',
      flexDirection: 'column',
      borderRight: `1px solid rgba(255,255,255,0.1)`,
    }}>
      {/* Header sidebar */}
      <div style={{
        padding: '16px 14px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 4,
        }}>
          <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>
            💬 Asistentes
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2,
            }}
            title="Cerrar panel"
          >
            ×
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
          Orientación para emprendedores CDMX
        </p>
      </div>

      {/* Lista dinámica de chats */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {CHAT_CATALOG.map(chat => {
          const isActive = chat.id === activeChatId;
          return (
            <button
              key={chat.id}
              disabled={!chat.available}
              onClick={() => chat.available && onSelectChat(chat.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 10px',
                marginBottom: 4,
                borderRadius: 8,
                border: isActive ? `1px solid rgba(255,255,255,0.3)` : '1px solid transparent',
                backgroundColor: isActive
                  ? 'rgba(255,255,255,0.15)'
                  : chat.available
                    ? 'transparent'
                    : 'rgba(0,0,0,0.15)',
                cursor: chat.available ? 'pointer' : 'default',
                color: chat.available ? C.white : 'rgba(255,255,255,0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 3 }}>{chat.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}>
                {chat.title}
              </div>
              <div style={{ fontSize: 10, marginTop: 2, lineHeight: 1.3,
                color: chat.available ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)' }}>
                {chat.available ? chat.description : '🔒 Próximamente'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer sidebar */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center',
      }}>
        SEDECO · MVP Hackathon 2025
      </div>
    </div>
  );
}

// ─── Componente: ventana de conversación ──────────────────────────────────────
function ChatWindow({ chatId, sessionState, onUpdateSession }) {
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const messagesEndRef = useRef(null);

  const chat = CHAT_CATALOG.find(c => c.id === chatId);
  const messages  = sessionState?.messages  || [];
  const sessionId = sessionState?.sessionId || chatId + '_' + Date.now();

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Mensaje de bienvenida automático al abrir un chat por primera vez
  useEffect(() => {
    if (messages.length === 0 && chat?.available) {
      const welcomeMsg = {
        role: 'assistant',
        content: `¡Hola! Soy tu **${chat.title}** 👋\n\n${chat.description}.\n\n¿En qué te puedo ayudar hoy?`,
        time: now(),
      };
      onUpdateSession(chatId, { messages: [welcomeMsg], sessionId });
    }
  // Solo al montar — no incluir messages en deps para evitar loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text, time: now() };
    const updatedMessages = [...messages, userMsg];
    onUpdateSession(chatId, { messages: updatedMessages, sessionId });
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const data = await sendChatMessage(sessionId, text, chatId);
      const botMsg = { 
        role: 'assistant', 
        content: data.response, 
        time: now(),
        mapHtml: data.map_html 
      };
      onUpdateSession(chatId, { messages: [...updatedMessages, botMsg], sessionId });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, sessionId, chatId, onUpdateSession]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    const newId = chatId + '_' + Date.now();
    await clearSession(sessionId).catch(() => {});
    onUpdateSession(chatId, { messages: [], sessionId: newId });
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      backgroundColor: C.white, overflow: 'hidden',
    }}>
      {/* Header del chat */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: C.white,
        borderBottom: `2px solid ${C.guinda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{chat?.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.guindaDark }}>
              {chat?.title}
            </div>
            <div style={{ fontSize: 11, color: C.gray600 }}>
              Basado en documentos oficiales · RAG
            </div>
          </div>
        </div>
        <button
          onClick={handleClear}
          title="Nueva conversación"
          style={{
            padding: '5px 10px', fontSize: 11, borderRadius: 6,
            border: `1px solid ${C.guinda}`, backgroundColor: 'white',
            color: C.guinda, cursor: 'pointer', fontWeight: 500,
          }}
        >
          ↺ Nueva
        </button>
      </div>

      {/* Área de mensajes */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column',
      }}>
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            backgroundColor: '#fff5f5', border: '1px solid #fcc',
            color: '#c00', fontSize: 12, marginBottom: 10,
          }}>
            ⚠️ {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensaje */}
      <div style={{
        padding: '12px 14px',
        borderTop: `1px solid ${C.gray200}`,
        backgroundColor: C.gray100,
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta… (Enter para enviar)"
          rows={2}
          style={{
            flex: 1, resize: 'none', border: `1px solid ${C.gray200}`,
            borderRadius: 10, padding: '8px 12px', fontSize: 13,
            outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
            backgroundColor: C.white,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          style={{
            padding: '10px 16px', borderRadius: 10,
            backgroundColor: input.trim() && !loading ? C.guinda : '#ccc',
            color: C.white, border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
            fontWeight: 600, fontSize: 13, flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          {loading ? '…' : '▶'}
        </button>
      </div>
    </div>
  );
}

function now() {
  return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// ─── Componente principal exportado ──────────────────────────────────────────
/**
 * ChatView
 * ─────────
 * Props:
 *   isOpen  {boolean}  — controla si el drawer está visible
 *   onClose {function} — callback para cerrar el panel
 */
export default function ChatView({ isOpen, onClose }) {
  // Chat activo (por defecto: el primero disponible)
  const defaultChat = CHAT_CATALOG.find(c => c.available)?.id;
  const [activeChatId, setActiveChatId] = useState(defaultChat);

  // Estado de sesión por chat: { [chatId]: { sessionId, messages } }
  const [sessions, setSessions] = useState({});

  const handleUpdateSession = useCallback((chatId, data) => {
    setSessions(prev => ({ ...prev, [chatId]: data }));
  }, []);

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
  };

  return (
    <>
      {/* Animación de puntos del bot (CSS keyframes) */}
      <style>{`
        @keyframes chatDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

      {/* Overlay oscuro detrás del drawer */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            zIndex: 1100,
            transition: 'opacity 0.25s ease',
          }}
        />
      )}

      {/* Drawer deslizable desde la derecha */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 760,
        display: 'flex',
        backgroundColor: C.guindaDark,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
        zIndex: 1200,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Sidebar izquierdo: catálogo de chats */}
        <ChatSidebar
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onClose={onClose}
        />

        {/* Ventana de conversación */}
        {activeChatId && (
          <ChatWindow
            key={activeChatId}          /* remonta al cambiar de chat */
            chatId={activeChatId}
            sessionState={sessions[activeChatId]}
            onUpdateSession={handleUpdateSession}
          />
        )}
      </div>
    </>
  );
}
