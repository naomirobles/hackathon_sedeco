# Proyecto Numeralia CDMX - React + FastAPI

## 🚀 Cómo correr el proyecto 

### Opción 1: Desarrollo (recomendada para empezar)

Necesitas **2 terminales** abiertas: 

```bash
# Terminal 1: Backend (FastAPI)
cd backend
pip install -r requirements.txt
C:\Python314\python.exe -m pip install pandas


uvicorn main:app --reload --port 8000
python -m uvicorn main:app --reload --port 8000


# Terminal 2: Frontend (React)
cd frontend
npm install
npm run dev
```

Luego abre: http://localhost:5173

### Opción 2: Docker (para producción)

```bash
docker-compose up --build
```

Abre: http://localhost:5173

---

## 📁 Estructura del proyecto

```
numeralia-cdmx/
├── backend/
│   ├── main.py              # API FastAPI
│   ├── requirements.txt     # Dependencias Python
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Componente principal
│   │   ├── main.jsx         # Entry point
│   │   ├── hooks/
│   │   │   └── useNumeralia.js
│   │   └── components/
│   │       ├── Sidebar.jsx
│   │       ├── MapView.jsx
│   │       └── Charts.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── data/
│   └── (pon aquí tu Excel y shapefiles)
│
├── docker-compose.yml
└── README.md
```

---

## ⚠️ Importante

Antes de correr, copia tus archivos de datos:

1. `numeralia_fallas.xlsx` → `backend/data/`
2. Carpeta `assets/Poligonos/` → `backend/assets/Poligonos/`
3. Carpeta `assets/Imagenes/` → `frontend/public/assets/Imagenes/`
