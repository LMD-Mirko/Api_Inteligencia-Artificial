# API de Inteligencia Artificial - PetBot

<div align="center">
  <img src="https://nodejs.org/static/images/logo.svg" alt="Node.js Logo" width="200"/>

</div>

API REST para un chatbot inteligente que utiliza la API de Together para proporcionar respuestas conversacionales. Este proyecto está diseñado para ser utilizado como backend para aplicaciones que requieren capacidades de chat con IA.

## 🚀 Características

- Endpoint REST para interacción con el chatbot
- Verificación automática del estado de la API
- Manejo de errores y timeouts
- Capacidad de reiniciar conversaciones
- CORS habilitado para integración con frontends
- Monitoreo del estado del servicio

## 📋 Prerrequisitos

- Node.js (versión recomendada: 14.x o superior)
- npm (incluido con Node.js)
- Conexión a internet para acceder a la API de Together

## 🔧 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/MRamosL/Api_Inteligencia-Artificial.git
cd Api_Inteligencia-Artificial
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno (si es necesario):
```bash
PORT=3001  # Puerto opcional, por defecto es 3001
```

## 🚀 Uso

1. Inicia el servidor:
```bash
npm start
```

El servidor se iniciará en `http://localhost:3001` (o el puerto especificado).

## 📡 Endpoints Disponibles

### GET /api/status
Verifica el estado del servicio y la conexión con la API de Together.

### POST /api/chat
Envía un mensaje al chatbot.

**Body:**
```json
{
    "mensaje": "Tu mensaje aquí"
}
```

### POST /api/chat/reiniciar
Reinicia la conversación actual.

### GET /api
Muestra información sobre los endpoints disponibles.

## ⚙️ Configuración

El servidor se configura automáticamente para:
- Usar el puerto especificado en la variable de entorno PORT o 3001 por defecto
- Verificar la conexión con la API cada 5 minutos
- Manejar timeouts de 30 segundos para las respuestas

## 🛠️ Tecnologías Utilizadas

- Node.js
- Express.js
- Axios
- CORS

## 📦 Dependencias Principales

- express: ^4.17.1
- axios: ^1.9.0
- cors: ^2.8.5



## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para más detalles.

## ✨ Características Adicionales

- Manejo robusto de errores
- Respuestas con timeout para evitar bloqueos
- Verificación periódica del estado de la API
- Documentación de API integrada
- Respuestas en formato JSON estandarizado

