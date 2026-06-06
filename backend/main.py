"""
Backend FastAPI — Consulta Cartográfica CDMX
=============================================
Ejecutar con: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import pandas as pd
import geopandas as gpd
import json
from pathlib import Path
import unicodedata
import base64
import io
from pydantic import BaseModel
import urllib.request
import urllib.error
import re
from urllib.parse import urljoin
import io
from shapely.geometry import shape
from shapely.ops import unary_union

# ─── Chatbot RAG ──────────────────────────────────────────────────────────────
# Cargar variables de entorno desde .env (si existe)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv no instalado; usar variables de entorno del sistema

from chatbot.router import router as chatbot_router
from chatbot.rag_engine import initialize_rag
# ─────────────────────────────────────────────────────────────────────────────

class FileUpload(BaseModel):
    filename: str
    content: str  # Aquí recibiremos el archivo como texto Base64

class UrlAnalizer(BaseModel):
    url: str

class GeometryRequest(BaseModel):
    geometry: dict  # GeoJSON FeatureCollection, Feature, o Geometry


app = FastAPI(title="API Consulta Cartográfica CDMX")

# ─── Registrar router del chatbot ─────────────────────────────────────────────
app.include_router(chatbot_router)
# ─────────────────────────────────────────────────────────────────────────────

def normalizar_texto(texto: str) -> str:
    """Elimina acentos y convierte a mayúsculas"""
    if not texto or not isinstance(texto, str):
        return texto
    # Normalizar para eliminar acentos (NFD separa el carácter de su acento)
    texto_norm = unicodedata.normalize('NFD', texto)
    # Filtrar solo caracteres que no sean acentos (Mn = Mark, Nonspacing)
    texto_limpio = "".join(c for c in texto_norm if unicodedata.category(c) != 'Mn')
    return texto_limpio.strip().upper()
def normalizar_municipio(nombre):
    norm = normalizar_texto(nombre)
    return ALCALDIA_MUNICIPIO_MAP.get(norm, norm)  # si no está en el mapa, devuelve el valor normalizado

# CORS - permite conexiones desde React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# CARGA DE DATOS AL INICIAR
# =============================================================================

DATA_DIR = Path(__file__).parent / "data"
ASSETS_DIR = Path(__file__).parent / "assets"

# Polígonos adicionales (GPKG)
poligonos_gdfs = {
    'alcaldias': None,
    'c2': None,
    'sectores': None,
    'cuadrantes': None,
    'colonias': None,
    'territorios_paz': None,
    # POIS (puntos de interés)
    'Mercados': None,
    'Panteones': None,
    'Media_Superior': None,
    'CAPAS_POIs': None,
}

POLYGON_CONFIG = {
    'alcaldias': ('alcaldias.gpkg', 'ALCALDIA'),
    'c2': ('c2.gpkg', 'ZONA'),
    'sectores': ('sectores.gpkg', 'SECTOR'),
    'cuadrantes': ('cuadrantes.gpkg', 'CVE_CUADRA'),
    'colonias': ('colonias.gpkg', 'NOM_ASENTA'),
    'territorios_paz': ('territorios_paz.gpkg', 'NOMBRE'),
    # POIS (puntos de interés)
    'CAPAS_POIs': ('POI/CAPAS_POIs.gpkg', 'POI'),
    'Mercados': ('POI/Mercados.gpkg', 'NOMBRE_POI'),
    'Panteones': ('POI/Panteones.gpkg', 'PANTEONES_POI_NOMBRE_POI'),
    'Media_Superior': ('POI/MEDIA_SUPERIOR_PUBLICA.gpkg', 'NOMBRE_POI'),
}

ALCALDIA_MUNICIPIO_MAP = {
    'LA MAGDALENA CONTRERAS': 'MAGDALENA CONTRERAS',
    'CUAJIMALPA DE MORELOS':  'CUAJIMALPA',
}

def cargar_datos():
    """Carga los GeoPackages al iniciar el servidor"""
    for key, (filename, col) in POLYGON_CONFIG.items():
        gpkg_path = ASSETS_DIR / "poligonos" / filename
        if gpkg_path.exists():
            try:
                gdf_pol = gpd.read_file(gpkg_path, layer=0, encoding='utf-8')

                # Normalizar columna de nombre si es necesario
                if key in ['alcaldias', 'territorios_paz', 'Media_Superior', 'CAPAS_POIs']:
                    gdf_pol[col] = gdf_pol[col].apply(normalizar_texto)

                poligonos_gdfs[key] = gdf_pol
                print(f"✓ Cargado polígono: {key} ({len(gdf_pol)} registros)")
            except Exception as e:
                print(f"⚠ Error cargando {filename}: {e}")
        else:
            print(f"⚠ No se encontró el archivo: {gpkg_path}")

# Cargar datos cartográficos al importar el módulo
cargar_datos()

# Pre-cargar el índice RAG del chatbot al iniciar el servidor
# (así la primera consulta del usuario no experimenta latencia de indexación)
initialize_rag()


# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/")
async def root():
    return {
        "mensaje": "API Consulta Cartográfica CDMX",
        "endpoints": [
            "/api/filtros/opciones",
            "/api/poligonos",
            "/api/pois/options",
            "/api/pois/especialidades",
        ]
    }

@app.get("/api/pois/options")
async def get_pois_options():
    """Retorna las opciones de tipos de POIs disponibles en la capa dinámica"""
    if 'CAPAS_POIs' not in poligonos_gdfs or poligonos_gdfs['CAPAS_POIs'] is None:
        return {"options": []}
    
    # Obtenemos los tipos únicos de la columna 'POI'
    gdf_pois = poligonos_gdfs['CAPAS_POIs']
    if 'POI' not in gdf_pois.columns:
        return {"options": []}
        
    options = sorted([str(o).upper() for o in gdf_pois['POI'].dropna().unique().tolist()])
    return {"options": options}

@app.get("/api/pois/especialidades")
async def get_pois_especialidades():
    """Retorna las especialidades únicas agrupadas por tipo de POI"""
    if 'CAPAS_POIs' not in poligonos_gdfs or poligonos_gdfs['CAPAS_POIs'] is None:
        return {"especialidades": {}}
    
    gdf_pois = poligonos_gdfs['CAPAS_POIs']
    
    if 'POI' not in gdf_pois.columns or 'ESPECIALID' not in gdf_pois.columns:
        return {"especialidades": {}}
    
    # Solo los tipos que nos interesan
    TIPOS_CON_ESPECIALIDAD = ['EDUCACION PUBLICA', 'EDUCACION PRIVADA', 'TIENDAS DEPARTAMENTALES']
    
    resultado = {}
    for tipo in TIPOS_CON_ESPECIALIDAD:
        mask = gdf_pois['POI'].str.upper() == tipo
        especialidades = (
            gdf_pois.loc[mask, 'ESPECIALID']
            .dropna()
            .unique()
            .tolist()
        )
        especialidades = sorted([str(e).upper() for e in especialidades if str(e).strip()])
        if especialidades:
            resultado[tipo] = especialidades
    
    return {"especialidades": resultado}

@app.get("/api/filtros/opciones")
async def get_filter_options():
    """Obtiene opciones disponibles para los filtros desde los GeoPackages geográficos."""

    def get_options(key, col):
        gdf_layer = poligonos_gdfs.get(key)
        if gdf_layer is None or gdf_layer.empty:
            return []
        return sorted(gdf_layer[col].dropna().astype(str).unique().tolist())

    return {
        "alcaldias": get_options('alcaldias', 'ALCALDIA'),
        "c2": get_options('c2', 'ZONA'),
        "sectores": get_options('sectores', 'SECTOR'),
        "colonias": get_options('colonias', 'NOM_ASENTA'),
        "cuadrantes": get_options('cuadrantes', 'CVE_CUADRA'),
        "territorios_paz": get_options('territorios_paz', 'NOMBRE'),
    }


# =============================================================================
# ENDPOINT DE POLÍGONOS — lógica jerárquica
# =============================================================================
#
# Panel "alcaldias":
#   - Sin alcaldías seleccionadas  → devuelve todas las alcaldias
#   - Con alcaldías seleccionadas  → devuelve límites de esas alcaldías
#
# Panel "sectores":
#   - Sin alcaldía ni sector       → todos los sectores
#   - Con alcaldía, sin sector     → sectores dentro de esa(s) alcaldía(s)
#   - Con sector(es)               → esos sectores
#
# Panel "colonias" / "cuadrantes":
#   - Sin nada                     → todas las colonias/cuadrantes
#   - Con alcaldía, sin sector     → colonias/cuadrantes dentro de la alcaldía
#   - Con sector(es)               → colonias/cuadrantes dentro del sector
#   - Con colonias/cuadrantes      → esas colonias/cuadrantes
# =============================================================================

@app.get("/api/poligonos")
async def get_poligonos(
    layer: str = Query(..., description="alcaldias | c2 | sectores | cuadrantes | colonias | territorios_paz | Mercados | Panteones | Media_Superior"),
    # Contexto jerárquico pasado por el frontend
    c2:           Optional[str] = Query(None, description="C2 seleccionados (coma-separadas)"),
    alcaldias:    Optional[str] = Query(None, description="Alcaldías seleccionadas (coma-separadas)"),
    sectores:     Optional[str] = Query(None, description="Sectores seleccionados (coma-separados)"),
    colonias:     Optional[str] = Query(None, description="Colonias seleccionadas (coma-separadas)"),
    cuadrantes:   Optional[str] = Query(None, description="Cuadrantes seleccionados (coma-separados)"),
    territorios_paz: Optional[str] = Query(None, description="Territorios de paz seleccionados"),
    # Parámetro heredado — aún admitido para compatibilidad
    filter_vals:  Optional[str] = Query(None),
):
    """
    Retorna polígonos GeoJSON aplicando la lógica jerárquica de visualización.
    El parámetro *layer* indica qué panel activó el checkbox; el frontend envía
    además los filtros activos para que el backend decida qué geometrías mostrar.
    """

    def _layer_data(key: str) -> Optional[gpd.GeoDataFrame]:
        if key not in poligonos_gdfs or poligonos_gdfs[key] is None:
            return None
        return poligonos_gdfs[key].copy()

    def _to_geojson(gdf_result) -> dict:
        if gdf_result is None or gdf_result.empty:
            return {"type": "FeatureCollection", "features": []}
        return json.loads(gdf_result.to_json())

    # -------------------------------------------------------------------------
    # Normalizar listas recibidas
    # -------------------------------------------------------------------------
    c2_list  = [normalizar_texto(a)  for a in c2.split(",")]              if c2            else []
    alc_list  = [normalizar_texto(a) for a in alcaldias.split(",")]      if alcaldias      else []
    sec_list  = [s.strip().upper()   for s in sectores.split(",")]       if sectores       else []
    col_list  = [c.strip().upper()   for c in colonias.split(",")]       if colonias       else []
    cuad_list = [c.strip().upper()   for c in cuadrantes.split(",")]     if cuadrantes     else []
    tp_list   = [normalizar_texto(t) for t in territorios_paz.split(",")] if territorios_paz else []

    # =========================================================================
    # POIS (Mercados y Panteones) 
    # =========================================================================
    if layer in ["Mercados", "Panteones", "Media_Superior"]:
        data = _layer_data(layer)

        if data is None or data.empty:
            return _to_geojson(None)
        
        # 1. Forzar coordenadas para MapLibre
        if data.crs is None or data.crs != "EPSG:4326":
            data = data.to_crs(epsg=4326)
            
        col_name = POLYGON_CONFIG[layer][1]
        
        # 2. IGNORAR FILTROS VACÍOS O "UNDEFINED"
        # Esto evita que si el frontend manda un filtro mal formado, se borren los 159 registros
        if filter_vals and str(filter_vals).strip() not in ["", "undefined", "null"]:
            vals = [normalizar_texto(v) for v in filter_vals.split(",") if v.strip()]
            if vals:
                # Usamos la columna NOMBRE_POI que ya detectó tu terminal
                data = data[data[col_name].isin(vals)]
        
        # 3. DEBUG: Verifica esto en tu terminal negra al activar el checkbox
        print(f">>> [API] Enviando {len(data)} polígonos de {layer}")
            
        return _to_geojson(data)
    
    # =========================================================================
    # PANEL C2
    # =========================================================================
    if layer == "c2":
        data = _layer_data('c2')
        if data is None:
            return _to_geojson(None)
        col = POLYGON_CONFIG['c2'][1]

        if c2_list:
            #  hay c2 elegidos : mostrar esos c2
            data = data[data[col].str.strip().str.upper().isin(c2_list)]
            # else: sin datos de cámaras, mostramos todo
        # sin nada: data ya contiene todos las alcaldias

        return _to_geojson(data)
    # =========================================================================
    # PANEL ALCALDÍAS  →  reglas 1.1 y 1.2
    # =========================================================================
    if layer == "alcaldias":
        data = _layer_data('alcaldias')
        if data is None:
            return _to_geojson(None)
        col = POLYGON_CONFIG['alcaldias'][1]

        if alc_list:
            data = data[data[col].str.strip().str.upper().isin(alc_list)]
        # sin nada: data ya contiene todas las alcaldías

        return _to_geojson(data)

    # =========================================================================
    # PANEL SECTORES  →  reglas 2.1, 2.2, 2.3
    # =========================================================================
    if layer == "sectores":
        data = _layer_data('sectores')
        if data is None:
            return _to_geojson(None)
        col = POLYGON_CONFIG['sectores'][1]

        if sec_list:
            data = data[data[col].str.strip().str.upper().isin(sec_list)]
        # sin nada: data ya contiene todos los sectores

        return _to_geojson(data)

    # =========================================================================
    # PANEL COLONIAS  →  reglas 3.1 – 3.4
    # =========================================================================
    if layer == "colonias":
        data = _layer_data('colonias')
        if data is None:
            return _to_geojson(None)
        col = POLYGON_CONFIG['colonias'][1]  # 'NOM_ASENTA'

        data['_MUNICIPIO_NORM'] = data['NOM_MUNICI'].apply(normalizar_municipio)

        if col_list:
            data = data[data[col].str.strip().str.upper().isin(col_list)]
        elif alc_list:
            data = data[data['_MUNICIPIO_NORM'].isin(alc_list)]
        # sin nada: todas las colonias

        data = data.drop(columns=['_MUNICIPIO_NORM'])
        return _to_geojson(data)

    # =========================================================================
    # PANEL CUADRANTES  →  reglas 3.1 – 3.4 (misma lógica)
    # =========================================================================
    if layer == "cuadrantes":
        data = _layer_data('cuadrantes')
        if data is None:
            return _to_geojson(None)
        col = POLYGON_CONFIG['cuadrantes'][1]

        if cuad_list:
            data = data[data[col].str.strip().str.upper().isin(cuad_list)]
        # sin nada: todos los cuadrantes

        return _to_geojson(data)

    # =========================================================================
    # PANEL TERRITORIOS DE PAZ  (lógica simple: filtrar por los seleccionados)
    # =========================================================================
    if layer == "territorios_paz":
        data = _layer_data('territorios_paz')
        if data is None:
            return _to_geojson(None)
        col = POLYGON_CONFIG['territorios_paz'][1]

        if tp_list:
            data = data[data[col].apply(normalizar_texto).isin(tp_list)]
        # si no hay selección, devuelve todos

        return _to_geojson(data)

    # =========================================================================
    # PANEL CAPAS_POIs (Capa dinámica)
    # =========================================================================
    if layer == "CAPAS_POIs":
        data = _layer_data(layer)
        if data is None or data.empty:
            return _to_geojson(None)

        # 1. Asegurar Proyección para MapLibre
        if data.crs is None or data.crs != "EPSG:4326":
            data = data.to_crs(epsg=4326)
        
        if alc_list:
            col_alc_poi = 'ALCALDIA' 
            if col_alc_poi in data.columns:
                data = data[data[col_alc_poi].str.strip().str.upper().isin(alc_list)]

        # 2. Filtrado Dinámico basado en la columna POI
        if filter_vals and str(filter_vals).strip() not in ["", "undefined", "null"]:
            try:
                # Obtenemos los tipos seleccionados en el menú
                vals = [normalizar_texto(v) for v in filter_vals.split(",") if v.strip()]
                if vals:
                    # Normalizamos la columna POI para la comparación
                    data['_TEMP_POI_NORM'] = data['POI'].apply(normalizar_texto)
                    # Filtramos: Solo incluir POIs cuyo tipo esté en la lista seleccionada
                    data = data[data['_TEMP_POI_NORM'].isin(vals)]
                    data = data.drop(columns=['_TEMP_POI_NORM'])
            except Exception as e:
                print(f"Error filtrando {layer}: {e}")

        data['geometry'] = data.geometry.centroid
        
        return _to_geojson(data)

    return {"error": f"Capa '{layer}' no reconocida.", "features": []}

# =============================================================================
# ENDPOINTS DENUE — carga lazy (no se inicializa al arrancar)
# =============================================================================

DENUE_PATH = ASSETS_DIR / "poligonos" / "denue_cuauhtemoc.gpkg"
_denue_gdf = None  # caché en memoria tras la primera petición


def _get_denue_gdf():
    global _denue_gdf
    if _denue_gdf is None and DENUE_PATH.exists():
        gdf = gpd.read_file(DENUE_PATH, layer=0)
        if not gdf.crs or gdf.crs.to_epsg() != 4326:
            gdf = gdf.to_crs(epsg=4326)
        cols_wanted = ['nombre_act', 'nom_estab', 'codigo_act', 'per_ocu', 'tipoUniEco', 'sector', 'geometry']
        cols_existing = [c for c in cols_wanted if c in gdf.columns]
        _denue_gdf = gdf[cols_existing].copy()
        print(f"✓ DENUE cargado: {len(_denue_gdf)} registros")
    return _denue_gdf


def _build_filter_geom(geom_data: dict):
    """Convierte FeatureCollection/Feature/Geometry de GeoJSON a shapely."""
    t = geom_data.get('type', '')
    if t == 'FeatureCollection':
        return unary_union([shape(f['geometry']) for f in geom_data['features']])
    if t == 'Feature':
        return shape(geom_data['geometry'])
    return shape(geom_data)


@app.post("/api/denue")
async def get_denue(req: GeometryRequest):
    """Filtra unidades DENUE por geometría dibujada. Devuelve GeoJSON mínimo."""
    try:
        gdf = _get_denue_gdf()
        if gdf is None or gdf.empty:
            return {"type": "FeatureCollection", "features": []}

        filter_geom = _build_filter_geom(req.geometry)
        mask = gdf.geometry.intersects(filter_geom)
        result = gdf[mask].copy()

        if result.empty:
            return {"type": "FeatureCollection", "features": []}

        return json.loads(result.to_json())
    except Exception as e:
        print(f"Error en /api/denue: {e}")
        return {"type": "FeatureCollection", "features": []}


@app.post("/api/denue/stats")
async def get_denue_stats(req: GeometryRequest):
    """Devuelve estadísticas agregadas por nombre_act en el área filtrada."""
    try:
        gdf = _get_denue_gdf()
        if gdf is None or gdf.empty:
            return {"total": 0, "categories": []}

        filter_geom = _build_filter_geom(req.geometry)
        mask = gdf.geometry.intersects(filter_geom)
        filtered = gdf[mask]

        total = len(filtered)
        if total == 0:
            return {"total": 0, "categories": []}

        counts = (
            filtered['nombre_act']
            .value_counts()
            .reset_index()
        )
        counts.columns = ['nombre_act', 'count']
        counts['percentage'] = (counts['count'] / total * 100).round(1)

        return {"total": int(total), "categories": counts.to_dict('records')}
    except Exception as e:
        print(f"Error en /api/denue/stats: {e}")
        return {"total": 0, "categories": []}


@app.post("/api/upload_base64")
async def upload_base64(data: FileUpload):
    try:
        # 1. Decodificar el contenido
        file_data = base64.b64decode(data.content)
        file_bytes = io.BytesIO(file_data)
        user_gdf = None

        # 2. Procesar según extensión
        if data.filename.lower().endswith('.gpkg'):
            # Leemos el GPKG directamente de la memoria
            user_gdf = gpd.read_file(file_bytes)
        elif data.filename.lower().endswith(('.xlsx', '.xls','.csv')):
            df = pd.read_excel(file_bytes) if not data.filename.endswith('.csv') else pd.read_csv(file_bytes)
            # Intentamos crear puntos si tiene LONGITUD y LATITUD
            if 'LONGITUD' in df.columns and 'LATITUD' in df.columns:
                user_gdf = gpd.GeoDataFrame(
                    df, 
                    geometry=gpd.points_from_xy(df.LONGITUD, df.LATITUD), 
                    crs="EPSG:4326"
                )
            else:
                return {"error": "El archivo Excel debe contener columnas 'LONGITUD' y 'LATITUD' para crear geometrías"}
        else:
            return {"error": "Formato no compatible. Usa GPKG o Excel con columnas LONGITUD/LATITUD"}

        # 3. Asegurar coordenadas para el mapa
        if user_gdf is None or user_gdf.empty:
            return {"error": "No se encontraron datos geográficos"}

        if user_gdf.crs is None:
            user_gdf.set_crs(epsg=4326, inplace=True)
        elif user_gdf.crs != "EPSG:4326":
            user_gdf = user_gdf.to_crs(epsg=4326)
        
        result = json.loads(user_gdf.to_json())
        return result
    except Exception as e:
        print(f"Error en upload: {str(e)}")
        return {"error": f"Error al procesar: {str(e)}"}

@app.post("/api/universal_analyzer")
async def universal_analyzer(data: UrlAnalizer):
    url = data.url.strip()
    
    # Configuramos un "User-Agent" para que los portales del gobierno 
    # no rechacen la conexión creyendo que somos un bot malicioso
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

    try:
        # CASO 1: Portales CKAN (ADIP, Datos Abiertos CDMX)
        if "datos.cdmx.gob.mx" in url or "adip" in url:
            dataset_name = url.rstrip('/').split('/')[-1]
            if dataset_name in ["", "datos.cdmx.gob.mx", "adip"]:
                return {"error": "Por favor ingresa la URL de un conjunto de datos específico (ej. .../dataset/nombre-del-dato), no la página principal."}
            api_url = f"https://datos.cdmx.gob.mx/api/3/action/package_show?id={dataset_name}"
            
            req = urllib.request.Request(api_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                
            if res_data.get('success'):
                resources = res_data['result']['resources']
                return {
                    "source": "CKAN/ADIP",
                    "options": [{"id": r['id'], "name": r['name'], "format": r['format'], "url": r.get('url')} for r in resources]
                }

        # CASO 2: Portales de Mapas/GIS (SEDUVI, INEGI)
        if "arcgis" in url or "FeatureServer" in url:
            return {
                "source": "ArcGIS",
                "options": [{"id": "layer_0", "name": "Capa Espacial GIS", "format": "FeatureServer", "url": url}]
            }

        # CASO 3: Scraper Genérico Nativo (Para buscar CSVs o Excels sueltos)
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            html_content = response.read().decode('utf-8', errors='ignore')
        
        # Usamos expresiones regulares para buscar links que terminen en formatos de datos
        href_regex = r'href=[\'"]?([^\'" >]+(?:csv|geojson|xlsx|xls|json))[\'"]?'
        matches = set(re.findall(href_regex, html_content, re.IGNORECASE))
        
        links = []
        for href in matches:
            full_url = urljoin(url, href)
            name = href.split('/')[-1] # Tomamos el nombre del archivo de la URL
            links.append({"id": full_url, "name": name, "format": "FILE", "url": full_url})
            
        return {"source": "Generic Scraper", "options": links[:15]}

    except Exception as e:
        return {"error": f"No se pudo acceder al portal: {str(e)}"}

@app.get("/api/load_external_resource")
async def load_external_resource(url: str = Query(...)):
    """Descarga el recurso desde la URL externa y lo convierte a GeoJSON"""
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    
    try:
        # 1. Descargamos el archivo directamente a la memoria
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read()

        # 2. Leemos el contenido con Pandas
        url_lower = url.lower()
        try:
            if '.xlsx' in url_lower or '.xls' in url_lower:
                df = pd.read_excel(io.BytesIO(content))
            else:
                try:
                    df = pd.read_csv(io.BytesIO(content), low_memory=False, encoding='utf-8')
                except UnicodeDecodeError:
                    df = pd.read_csv(io.BytesIO(content), low_memory=False, encoding='latin1')
        except Exception as e:
            return {"error": f"El archivo descargado no es un CSV o Excel válido. Detalle: {str(e)}"}

        # 3. Auto-detección de columnas de coordenadas
        lat_col = next((c for c in df.columns if c.upper() in ['LATITUD', 'LATITUDE', 'LAT', 'Y', 'COORD_Y']), None)
        lon_col = next((c for c in df.columns if c.upper() in ['LONGITUD', 'LONGITUDE', 'LON', 'X', 'COORD_X']), None)

        if not lat_col or not lon_col:
            return {"error": "El archivo no contiene columnas reconocibles de Latitud y Longitud para el mapa."}

        # ====================================================================
        # 4. LIMPIEZA EXTREMA (La vacuna contra el error de MapLibre)
        # ====================================================================
        df[lat_col] = df[lat_col].astype(str).str.replace(',', '.', regex=False)
        df[lon_col] = df[lon_col].astype(str).str.replace(',', '.', regex=False)

        # Forzar a números
        df[lat_col] = pd.to_numeric(df[lat_col], errors='coerce')
        df[lon_col] = pd.to_numeric(df[lon_col], errors='coerce')
        
        # Eliminar Infinitos y Nulos
        df = df.replace([float('inf'), float('-inf')], float('nan'))
        df = df.dropna(subset=[lat_col, lon_col])

        # Filtrar límites geográficos lógicos (Latitud -90 a 90, Longitud -180 a 180)
        df = df[(df[lat_col] >= -90) & (df[lat_col] <= 90)]
        df = df[(df[lon_col] >= -180) & (df[lon_col] <= 180)]

        if len(df) == 0:
             return {"error": "El archivo se descargó, pero todas las coordenadas estaban corruptas o vacías."}

        # 5. Reducción de muestra inteligente para que no se trabe el navegador
        MAX_POINTS = 30000
        if len(df) > MAX_POINTS:
            print(f"Reduciendo {len(df)} puntos a {MAX_POINTS} para evitar colapso de RAM...")
            df = df.sample(n=MAX_POINTS, random_state=42)

        # 6. Conversión final a mapa
        user_gdf = gpd.GeoDataFrame(
            df, 
            geometry=gpd.points_from_xy(df[lon_col], df[lat_col]),
            crs="EPSG:4326"
        )
        
        # Destruir cualquier geometría vacía que haya sobrevivido
        user_gdf = user_gdf[~user_gdf.geometry.is_empty]
        user_gdf = user_gdf[user_gdf.geometry.notna()]
        
        return json.loads(user_gdf.to_json())

    except Exception as e:
        print(f"Error procesando el archivo externo: {e}")
        return {"error": f"Error al procesar el archivo: {str(e)}"}
    
# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
