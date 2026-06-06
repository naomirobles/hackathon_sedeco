import os
import requests
import folium
from typing import TypedDict, List, Any, Literal
from pydantic import BaseModel, Field, field_validator
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, START, END

# Configuración desde variables de entorno
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
ORS_API_KEY = os.getenv("ORS_API_KEY")

class RouteState(TypedDict):
    user_input: str
    intent: str
    locations: List[str]
    search_query: str
    limit: int
    coordinates: List[List[float]]
    nearby_results: List[dict]
    map_obj: Any
    final_response: str

class AgentExtraction(BaseModel):
    intent: Literal["route_sequential", "route_hub", "nearby"] = Field(
        description="""Clasifica la intención del viaje:
        'route_sequential' para un viaje continuo multiparada (A->B->C).
        'route_hub' para calcular trayectos independientes desde un mismo punto de origen hacia varios destinos (A->B y A->C).
        'nearby' para buscar negocios genéricos."""
    )
    locations: List[str] = Field(
        description="El indice 0 siempre es el origen. Luego lista los destinos limpios para GPS."
    )
    search_query: str = Field(
        default="",
        description="Qué categoria genérica busca el usuario. Vacio si no es 'nearby'."
    )
    limit: Any = Field(
        default=3,
        description="Cantidad de lugares a buscar."
    )

    @field_validator('limit', mode='before')
    @classmethod
    def parse_limit_to_int(cls, value):
        try:
            return int(value)
        except (ValueError, TypeError):
            return 3

def node_analyze_intent(state: RouteState) -> RouteState:
    print("🧠 [Agente] Analizando la solicitud con OpenRouter (Gemma 4)...")

    llm = ChatOpenAI(
        model="google/gemma-4-26b-a4b-it",
        api_key=OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1",
        temperature=0,
        default_headers={
            "HTTP-Referer": "https://hackathon-sedeco.cdmx.gob.mx",
            "X-Title": "Agente Logistico CDMX",
        }
    )
    structured_llm = llm.with_structured_output(AgentExtraction)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """Eres un orquestador espacial de alta precisión.

        REGLA CRITICA PARA 'locations': Limpia el lenguaje natural. Elimina frases como "cerca de". Ejemplo BIEN: 'Oxxo Eje 10 Sur'.

        1. 'route_sequential' (CONSECUTIVA): El usuario quiere ir de A hacia B, y *luego* de B hacia C en un solo trayecto.
        2. 'route_hub' (AISLADAS/ESTRELLA): El usuario tiene una base (A) y quiere visualizar rutas independientes hacia diferentes destinos.
        3. 'nearby' (CATEGORIAS): Descubrir establecimientos por etiqueta genérica OSM.

        Asume Ciudad de México si hay ambigüedad."""),
        ("human", "{user_input}")
    ])

    res = (prompt | structured_llm).invoke({"user_input": state["user_input"]})
    
    return {
        "intent": res.intent,
        "locations": res.locations,
        "search_query": res.search_query,
        "limit": res.limit
    }

import urllib.parse

def node_geocode(state: RouteState) -> RouteState:
    coords = []
    for loc in state["locations"]:
        query_text = loc if "mÃ©xico" in loc.lower() or "cdmx" in loc.lower() else f"{loc}, Ciudad de MÃ©xico"
        # Codificar el texto para evitar errores de codec con acentos
        encoded_text = urllib.parse.quote(query_text)
        res = requests.get(
            'https://api.openrouteservice.org/geocode/search',
            params={'api_key': ORS_API_KEY, 'text': query_text, 'size': 1, 'boundary.country': 'MX'}
        )
        # requests maneja la codificaciÃ³n automÃ¡ticamente en params, 
        # pero el error de ascii suele venir de prints o logs con caracteres especiales
        if res.status_code == 200 and res.json()['features']:
            coords.append(res.json()['features'][0]['geometry']['coordinates'])
    return {"coordinates": coords}


def node_calculate_route(state: RouteState) -> RouteState:
    if len(state["coordinates"]) < 2:
        return {"map_obj": None, "final_response": "No pude encontrar las ubicaciones necesarias para trazar la ruta."}

    mapa = folium.Map(location=[state["coordinates"][0][1], state["coordinates"][0][0]], zoom_start=14)
    url_route = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson'
    headers_route = {'Authorization': ORS_API_KEY, 'Content-Type': 'application/json'}

    response_text = ""

    if state["intent"] == "route_sequential":
        res = requests.post(url_route, headers=headers_route, json={"coordinates": state["coordinates"]})
        if res.status_code == 200:
            data = res.json()
            puntos = [[p[1], p[0]] for p in data['features'][0]['geometry']['coordinates']]
            distancia = data['features'][0]['properties']['summary']['distance'] / 1000
            tiempo = data['features'][0]['properties']['summary']['duration'] / 60
            
            for i, pt in enumerate(state["coordinates"]):
                color = "green" if i == 0 else ("red" if i == len(state["coordinates"]) - 1 else "blue")
                folium.Marker([pt[1], pt[0]], popup=state['locations'][i]).add_to(mapa)

            folium.PolyLine(puntos, color="darkblue", weight=5).add_to(mapa)
            response_text = f"He generado la ruta secuencial. Distancia total: {distancia:.2f} km. Tiempo estimado: {tiempo:.2f} min."
        else:
            response_text = "Hubo un error al calcular la ruta secuencial."

    elif state["intent"] == "route_hub":
        origen_coords = state["coordinates"][0]
        folium.Marker([origen_coords[1], origen_coords[0]], popup=state['locations'][0], icon=folium.Icon(color="green")).add_to(mapa)
        
        response_text = f"He calculado {len(state['coordinates'])-1} rutas desde {state['locations'][0]}:\n"
        for i, dest_coords in enumerate(state["coordinates"][1:], start=1):
            res = requests.post(url_route, json={"coordinates": [origen_coords, dest_coords]}, headers=headers_route)
            if res.status_code == 200:
                data = res.json()
                puntos = [[p[1], p[0]] for p in data['features'][0]['geometry']['coordinates']]
                distancia = data['features'][0]['properties']['summary']['distance'] / 1000
                folium.PolyLine(puntos, weight=5).add_to(mapa)
                folium.Marker([dest_coords[1], dest_coords[0]], popup=state['locations'][i]).add_to(mapa)
                response_text += f"- Hacia {state['locations'][i]}: {distancia:.2f} km\n"

    return {"map_obj": mapa, "final_response": response_text}

def node_search_nearby_and_route(state: RouteState) -> RouteState:
    if not state.get("coordinates"):
        return {"map_obj": None, "final_response": "No pude geolocalizar el punto de origen."}

    origen_lon, origen_lat = state["coordinates"][0]
    res_search = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": state['search_query'], "format": "json", "limit": state["limit"], "lat": origen_lat, "lon": origen_lon},
        headers={'User-Agent': 'LangGraphAgent/1.2'}
    )
    resultados = res_search.json() if res_search.status_code == 200 else []

    mapa = folium.Map(location=[origen_lat, origen_lon], zoom_start=14)
    folium.Marker([origen_lat, origen_lon], icon=folium.Icon(color="red")).add_to(mapa)

    url_route = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson'
    headers_route = {'Authorization': ORS_API_KEY, 'Content-Type': 'application/json'}

    response_text = f"Encontré {len(resultados)} lugares para '{state['search_query']}' cerca de {state['locations'][0]}:\n"
    for item in resultados:
        dest_lat, dest_lon = float(item["lat"]), float(item["lon"])
        nombre = item.get("display_name", "").split(",")[0]
        folium.Marker([dest_lat, dest_lon], popup=nombre).add_to(mapa)
        res_route = requests.post(url_route, json={"coordinates": [[origen_lon, origen_lat], [dest_lon, dest_lat]]}, headers=headers_route)
        if res_route.status_code == 200:
            puntos_ruta = [[p[1], p[0]] for p in res_route.json()['features'][0]['geometry']['coordinates']]
            folium.PolyLine(puntos_ruta, weight=4, color="darkblue", opacity=0.5).add_to(mapa)
            distancia = res_route.json()['features'][0]['properties']['summary']['distance'] / 1000
            response_text += f"- {nombre}: a {distancia:.2f} km\n"

    return {"map_obj": mapa, "final_response": response_text}

def route_decision(state: RouteState) -> str:
    return "router" if state["intent"] in ["route_sequential", "route_hub"] else "searcher"

# Configuración del Grafo
workflow = StateGraph(RouteState)
workflow.add_node("analyzer", node_analyze_intent)
workflow.add_node("geocoder", node_geocode)
workflow.add_node("router", node_calculate_route)
workflow.add_node("searcher", node_search_nearby_and_route)
workflow.add_edge(START, "analyzer")
workflow.add_edge("analyzer", "geocoder")
workflow.add_conditional_edges("geocoder", route_decision, {"router": "router", "searcher": "searcher"})
workflow.add_edge("router", END)
workflow.add_edge("searcher", END)
spatial_app = workflow.compile()

def run_spatial_agent(user_input: str):
    """Ejecuta el agente y devuelve el texto y el HTML del mapa."""
    # Leer llaves en cada ejecución para asegurar que estén cargadas
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    # Usar la llave de ORS del .env o el fallback del script original
    ors_key = os.getenv("ORS_API_KEY") or 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjhjZjYzNjc0ZDI2YTQyZThiNjQ2NjAwOGMzNTE2ZTQ3IiwiaCI6Im11cm11cjY0In0='
    
    if not openrouter_key:
        return "Error: Falta la llave OPENROUTER_API_KEY en el servidor.", None
    if not ors_key:
        return "Error: Falta la llave ORS_API_KEY en el servidor.", None

    # Configurar el motor con las llaves actuales
    # (Re-instanciamos brevemente para asegurar que use las llaves del entorno actual)
    llm = ChatOpenAI(
        model="google/gemma-4-26b-a4b-it",
        api_key=openrouter_key,
        base_url="https://openrouter.ai/api/v1",
        temperature=0,
        default_headers={
            "HTTP-Referer": "https://hackathon-sedeco.cdmx.gob.mx",
            "X-Title": "Agente Logistico CDMX",
        }
    )
    
    try:
        # Sobrescribir variables globales para los nodos
        global OPENROUTER_API_KEY, ORS_API_KEY
        OPENROUTER_API_KEY = openrouter_key
        ORS_API_KEY = ors_key
        
        result = spatial_app.invoke({"user_input": user_input})
        response_text = result.get("final_response", "No se pudo procesar la solicitud.")
        map_html = None
        if result.get("map_obj"):
            map_html = result["map_obj"]._repr_html_()
        return response_text, map_html
    except Exception as e:
        return f"Error al ejecutar el agente: {str(e)}", None
