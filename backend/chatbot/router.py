"""
chatbot/router.py
-----------------
Router FastAPI del chatbot.

Se registra en main.py con:
    app.include_router(chatbot_router)

Endpoints:
  POST /api/chat              → enviar un mensaje al chatbot
  DELETE /api/chat/{session_id} → limpiar la memoria de una sesión
  GET  /api/chat/status       → verificar que el RAG está listo
"""

from fastapi import APIRouter, HTTPException

from .models import ChatRequest, ChatResponse, SessionClearResponse
from .rag_engine import create_chat_engine
from .spatial_agent import run_spatial_agent
from .memory import get_session, set_session, clear_session, active_sessions

router = APIRouter(prefix="/api", tags=["Chatbot"])


# ---------------------------------------------------------------------------
# POST /api/chat — endpoint principal
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Recibe un mensaje del usuario y devuelve la respuesta del chatbot.

    - Mantiene memoria conversacional por `session_id`.
    - Usa RAG o el Agente Espacial según `assistant_id`.
    """
    try:
        # Caso 1: Agente de Logística y Rutas (Stateless)
        if request.assistant_id == "logistica_rutas":
             response_text, map_html = run_spatial_agent(request.message)
             return ChatResponse(response=response_text, map_html=map_html)

        # Caso 2: Asesor de Negocios (RAG con LlamaIndex)
        # Recuperar motor existente o crear uno nuevo para esta sesión
        engine = get_session(request.session_id)
        if engine is None:
            engine = create_chat_engine()
            set_session(request.session_id, engine)

        # Obtener respuesta del LLM + RAG
        response = engine.chat(request.message)

        return ChatResponse(response=str(response))

    except EnvironmentError as e:
        # OPENAI_API_KEY no configurada
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar el mensaje: {str(e)}"
        )


# ---------------------------------------------------------------------------
# DELETE /api/chat/{session_id} — limpiar sesión
# ---------------------------------------------------------------------------
@router.delete("/chat/{session_id}", response_model=SessionClearResponse)
async def clear_chat_session(session_id: str):
    """
    Elimina la memoria conversacional de una sesión.
    Útil cuando el usuario quiere empezar desde cero.
    """
    found = clear_session(session_id)
    if found:
        return SessionClearResponse(message=f"Sesión '{session_id}' eliminada correctamente.")
    return SessionClearResponse(message=f"La sesión '{session_id}' no existía.")


# ---------------------------------------------------------------------------
# GET /api/chat/status — healthcheck del RAG
# ---------------------------------------------------------------------------
@router.get("/chat/status")
async def chat_status():
    """
    Verifica el estado del módulo chatbot.
    Devuelve cuántas sesiones hay activas y si el índice RAG está listo.
    """
    from .rag_engine import _index  # importación local para no crear efectos secundarios

    return {
        "status": "ok",
        "rag_index_loaded": _index is not None,
        "active_sessions": len(active_sessions()),
        "session_ids": active_sessions(),
    }
