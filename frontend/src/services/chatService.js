/**
 * services/chatService.js
 * ────────────────────────
 * Capa de servicio para el endpoint del chatbot.
 * Toda comunicación con /api/chat pasa por aquí.
 *
 * El proxy de Vite (vite.config.js) redirige /api → http://localhost:8000,
 * por lo que no hace falta la URL base completa en desarrollo.
 */

const BASE = '/api';

/**
 * Envía un mensaje al chatbot y retorna la respuesta del LLM.
 *
 * @param {string} sessionId    — ID único de la sesión conversacional
 * @param {string} message      — Mensaje del usuario
 * @param {string} assistantId  — ID del asistente (opcional)
 * @returns {Promise<{ response: string, map_html?: string }>}
 */
export async function sendChatMessage(sessionId, message, assistantId = 'viabilidad_negocio') {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      session_id: sessionId, 
      message,
      assistant_id: assistantId 
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status} al contactar el chatbot`);
  }

  return res.json(); // { response: "..." }
}

/**
 * Elimina la memoria conversacional de una sesión en el backend.
 * Útil para el botón "Nueva conversación".
 *
 * @param {string} sessionId
 * @returns {Promise<{ message: string }>}
 */
export async function clearSession(sessionId) {
  const res = await fetch(`${BASE}/chat/${sessionId}`, { method: 'DELETE' });
  return res.json();
}

/**
 * Verifica el estado del módulo RAG en el backend.
 * Útil para mostrar un indicador de "sistema listo".
 *
 * @returns {Promise<{ status: string, rag_index_loaded: boolean }>}
 */
export async function getChatStatus() {
  const res = await fetch(`${BASE}/chat/status`);
  return res.json();
}
