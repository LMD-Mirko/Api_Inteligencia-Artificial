const express = require('express');
const cors = require('cors');
const { responderChat, reiniciarConversacion, verificarConexion } = require('./chatbot');

const app = express();

// Función para obtener el puerto del servidor
const obtenerPuerto = () => {
  return process.env.PORT || 3001;
};

const PORT = obtenerPuerto();

app.use(cors());
app.use(express.json());

let apiDisponible = false;

const comprobarEstadoAPI = async () => {
  try {
    apiDisponible = await verificarConexion();
    console.log(`Estado de la API: ${apiDisponible ? 'Conectado' : 'Desconectado'}`);
  } catch (error) {
    apiDisponible = false;
    console.error('Error al verificar la conexión con la API:', error);
  }
};

comprobarEstadoAPI();
setInterval(comprobarEstadoAPI, 5 * 60 * 1000);

app.get('/api/status', async (req, res) => {
  try {
    apiDisponible = await verificarConexion();
    res.json({ 
      status: 'ok', 
      apiConectada: apiDisponible 
    });
  } catch (error) {
    console.error('Error al verificar estado:', error);
    res.status(500).json({ 
      status: 'error',
      mensaje: 'Error al verificar la conexión con la API de Together',
      apiConectada: false
    });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!apiDisponible) {
      return res.status(503).json({
        status: 'error',
        mensaje: 'El servicio de IA no está disponible en este momento',
        respuesta: 'Lo siento, el servicio de IA no está disponible. Estamos trabajando para resolver el problema.'
      });
    }
    
    const { mensaje } = req.body;
    
    if (!mensaje || typeof mensaje !== 'string') {
      return res.status(400).json({
        status: 'error',
        mensaje: 'El mensaje es requerido y debe ser un texto'
      });
    }
    
    console.log(`Procesando mensaje: "${mensaje}"`);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tiempo de espera agotado')), 30000);
    });
    
    const respuesta = await Promise.race([
      responderChat(mensaje),
      timeoutPromise
    ]);
    
    return res.json({
      status: 'ok',
      respuesta
    });
    
  } catch (error) {
    console.error('Error en la API de chat:', error);
    
    let mensaje = 'Error al procesar el mensaje';
    let statusCode = 500;
    
    if (error.message === 'Tiempo de espera agotado') {
      mensaje = 'La respuesta está tomando demasiado tiempo. Por favor, intenta con una pregunta más corta.';
      statusCode = 504;
    }
    
    return res.status(statusCode).json({
      status: 'error',
      mensaje,
      respuesta: 'Lo siento, ocurrió un error al procesar tu mensaje. El equipo técnico ha sido notificado.'
    });
  }
});

app.post('/api/chat/reiniciar', (req, res) => {
  try {
    const mensaje = reiniciarConversacion();
    res.json({
      status: 'ok',
      mensaje: 'Conversación reiniciada correctamente',
      respuesta: mensaje
    });
  } catch (error) {
    console.error('Error al reiniciar la conversación:', error);
    res.status(500).json({
      status: 'error',
      mensaje: 'Error al reiniciar la conversación'
    });
  }
});

app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    mensaje: 'API de PetBot - PetConnect',
    endpoints: [
      { ruta: '/api/status', método: 'GET', descripción: 'Verificar el estado del servicio' },
      { ruta: '/api/chat', método: 'POST', descripción: 'Enviar un mensaje al chatbot', body: { mensaje: 'string' } },
      { ruta: '/api/chat/reiniciar', método: 'POST', descripción: 'Reiniciar la conversación' }
    ]
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    mensaje: 'Ruta no encontrada'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
  console.log(`URL de la API: http://localhost:${PORT}/api`);
  console.log('Verificando conexión con la API de Together...');
});