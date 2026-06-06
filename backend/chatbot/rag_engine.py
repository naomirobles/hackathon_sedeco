"""
chatbot/rag_engine.py
---------------------
Implementación del sistema RAG con LlamaIndex.

Flujo:
  1. SimpleDirectoryReader carga los archivos .md / .txt de knowledge_base/
  2. VectorStoreIndex convierte los chunks en embeddings (OpenAI text-embedding-3-small)
  3. El índice se guarda en RAM (singleton), se construye solo la primera vez
  4. as_chat_engine() crea un motor con:
       - Búsqueda semántica sobre el índice (retrieval)
       - ChatMemoryBuffer para mantener el hilo de la conversación
       - System prompt que define el rol y las reglas del asistente

Para añadir un nuevo tipo de negocio:
  → Simplemente agrega un nuevo archivo .md en knowledge_base/
  → El sistema lo indexará automáticamente sin cambiar código.
"""

import os
from pathlib import Path

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
KNOWLEDGE_BASE_DIR = Path(__file__).parent / "knowledge_base"

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """
Eres un asistente virtual del Gobierno de la Ciudad de México especializado en
orientar a emprendedores sobre cómo abrir un negocio de forma legal y ordenada.

## Tu función
- Guiar al usuario sobre permisos, trámites, pasos y dependencias necesarios
- Responder ÚNICAMENTE con información que esté en los documentos proporcionados
- Ser claro, conciso y organizado; usa listas cuando ayude a la claridad

## Reglas de comportamiento
1. Saluda al usuario cuando empiece la conversación.
2. Si el usuario no ha dicho qué negocio quiere abrir, pregúntaselo amablemente.
3. Si detectas que quiere abrir un RESTAURANTE, estructura tu respuesta así:
   - **Permisos necesarios**
   - **Trámites requeridos**
   - **Pasos recomendados (en orden)**
   - **Dependencias involucradas**
   - **Recomendaciones generales**
4. Si el tipo de negocio NO es un restaurante, responde:
   "Actualmente el sistema solo cuenta con información para restaurantes.
    Puedo orientarte con ese tipo de negocio. ¿Te gustaría información sobre
    cómo abrir un restaurante?"
5. No inventes datos. Si no hay información en los documentos, dilo claramente.
6. Responde siempre en español.
7. Mantén un tono profesional pero cercano.
"""

# ---------------------------------------------------------------------------
# Índice global (singleton) — se construye una sola vez al iniciar el servidor
# ---------------------------------------------------------------------------
_index: VectorStoreIndex | None = None


def _build_index() -> VectorStoreIndex:
    """
    Construye el índice vectorial a partir de los documentos locales.
    Se ejecuta solo la primera vez (patrón singleton).
    """
    global _index
    if _index is not None:
        return _index

    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")

    if openrouter_api_key:
        from llama_index.llms.openai_like import OpenAILike
        print("✓ Chatbot: Usando OpenRouter como motor LLM")
        Settings.llm = OpenAILike(
            model="google/gemma-4-26b-a4b-it",
            api_base="https://openrouter.ai/api/v1",
            api_key=openrouter_api_key,
            is_chat_model=True,
            default_headers={
                "HTTP-Referer": "https://hackathon-sedeco.cdmx.gob.mx",
                "X-Title": "Asesor de Negocios CDMX",
            }
        )
    elif openai_api_key:
        print("✓ Chatbot: Usando OpenAI como motor LLM")
        Settings.llm = OpenAI(
            model="gpt-4o-mini",      # Rápido y económico para MVP
            temperature=0.2,
            api_key=openai_api_key,
        )
    else:
        raise EnvironmentError(
            "⚠ No se encontró OPENROUTER_API_KEY ni OPENAI_API_KEY. "
            "Define al menos una en el archivo .env"
        )

    # Configurar modelo de embeddings
    if openai_api_key:
        Settings.embed_model = OpenAIEmbedding(
            model="text-embedding-3-small",
            api_key=openai_api_key,
        )
    else:
        # Si no hay OpenAI key, usamos un modelo local (HuggingFace)
        # Esto requiere: pip install llama-index-embeddings-huggingface
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding
        Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")

    # Cargar todos los .md y .txt de knowledge_base/
    documents = SimpleDirectoryReader(
        input_dir=str(KNOWLEDGE_BASE_DIR),
        required_exts=[".md", ".txt"],   # Solo archivos de conocimiento
    ).load_data()

    if not documents:
        raise FileNotFoundError(
            f"No se encontraron documentos en {KNOWLEDGE_BASE_DIR}. "
            "Asegúrate de tener al menos un archivo .md o .txt."
        )

    print(f"✓ Chatbot RAG: {len(documents)} documento(s) cargado(s) desde {KNOWLEDGE_BASE_DIR}")

    # Construir índice vectorial en RAM
    _index = VectorStoreIndex.from_documents(documents)
    print("✓ Índice vectorial del chatbot construido correctamente")

    return _index


def create_chat_engine():
    """
    Devuelve un nuevo motor de chat con:
      - Acceso al índice RAG (búsqueda semántica)
      - Memoria conversacional (ChatMemoryBuffer)
      - System prompt con las reglas del asistente

    Llamar una vez por sesión de usuario.
    """
    index = _build_index()

    return index.as_chat_engine(
        chat_mode="context",          # Recupera contexto relevante en cada turno
        memory=ChatMemoryBuffer.from_defaults(token_limit=4000),
        system_prompt=SYSTEM_PROMPT,
        similarity_top_k=3,           # Cuántos chunks recuperar por consulta
        verbose=False,
    )


def initialize_rag() -> None:
    """
    Pre-carga el índice al arrancar el servidor para que la primera
    petición del usuario no experimente latencia de indexación.
    Llamar desde el lifespan / startup de FastAPI.
    """
    try:
        _build_index()
    except Exception as e:
        print(f"⚠ No se pudo inicializar el RAG del chatbot: {e}")
