const axios = require('axios');
const API_KEY = 'tgp_v1_UBBxv9fJG_MtVIaYreHLY1RJ0WFsgn3ClnWS-YTWcKA';
const MODEL = "mistralai/Mixtral-8x7B-v0.1";
const MAX_HISTORIA = 20;
const MAX_TOKENS = 600; 

const CACHE_TIEMPO = 60 * 60 * 1000; 
const cacheRespuestas = new Map();

let historialConversacion = [];

const reiniciarConversacion = () => {
  historialConversacion = [];
  console.log("Conversación reiniciada");
  return "Conversación reiniciada. ¿En qué puedo ayudarte con tu mascota?";
};

const mejorarInstruccionesSistema = () => {
  return "Eres PetBot, asistente del refugio PetConnect en Perú. IMPORTANTE: Tus respuestas deben ser claras, organizadas y útiles. Sigue estas reglas:\n\
1. Usa encabezados claros para cada sección relevante.\n\
2. Usa listas numeradas para información estructurada (máximo 5 puntos).\n\
3. Responde en un tono profesional y amigable.\n\
4. Proporciona ejemplos concretos si es necesario.\n\
5. Mantén las respuestas concisas, pero no omitas información importante.";
};

const formatearListasEnumeradas = (texto) => {
  let lineas = texto.split('\n');
  let resultado = [];
  let esLista = false;
  let contadorLista = 1;
  
  for (let i = 0; i < lineas.length; i++) {
    let linea = lineas[i].trim();
    
    if (linea.match(/^(\d+\.|[-•])\s+/) || 
        (i > 0 && lineas[i-1].match(/:\s*$/) && linea.length > 0)) {
      
      if (!esLista) {
        esLista = true;
        contadorLista = 1;
      }
      
      let contenido = linea.replace(/^(\d+\.|[-•])\s+/, '');
      resultado.push(`${contadorLista}. ${contenido}`);
      contadorLista++;
    } else {
      esLista = false;
      resultado.push(linea);
    }
  }
  
  return resultado.join('\n');
};

const limpiarRespuesta = (respuesta) => {
  let textoLimpio = respuesta.replace(/<\|im_end\|>|<\|im_start\|>|<\|.*?\|>/g, '').trim();

  textoLimpio = textoLimpio.replace(/```.*?```/gs, '').trim();

  textoLimpio = textoLimpio.replace(/user:.*|assistant:.*|humano:.*|usuario:.*|system:.*/gi, '').trim();

  const lineas = textoLimpio.split('\n');
  const encabezados = lineas.map((linea) => {
    if (linea.match(/^[A-Z].*:/)) {
      return `### ${linea}`;
    }
    return linea;
  });

  textoLimpio = encabezados.join('\n');

  const listasNumeradas = textoLimpio.split('\n').map((linea, index) => {
    if (linea.startsWith('- ')) {
      return `${index + 1}. ${linea.slice(2)}`;
    }
    return linea;
  });

  return listasNumeradas.join('\n');
};

const generarClaveCaché = () => {
  if (historialConversacion.length === 0) return '';
  
  const mensajesRecientes = historialConversacion.slice(-3);
  return mensajesRecientes.map(m => `${m.role}:${m.content}`).join('|');
};

const responderChat = async (mensajeUsuario) => {
  try {
    if (!mensajeUsuario || mensajeUsuario.trim() === '') {
      return "Por favor, escribe un mensaje para que pueda ayudarte.";
    }

    historialConversacion.push({
      role: "user",
      content: mensajeUsuario
    });
    
    if (historialConversacion.length > MAX_HISTORIA) {
      historialConversacion = historialConversacion.slice(-MAX_HISTORIA);
    }
    
    const claveCaché = generarClaveCaché();
    const entradaCaché = cacheRespuestas.get(claveCaché);
    
    if (entradaCaché && (Date.now() - entradaCaché.timestamp) < CACHE_TIEMPO) {
      console.log("Respuesta recuperada de caché");
      
      historialConversacion.push({
        role: "assistant",
        content: entradaCaché.respuesta
      });
      
      return entradaCaché.respuesta;
    }
    
    const mensajesIA = [
      {
        "role": "system",
        "content": mejorarInstruccionesSistema()
      },
      ...historialConversacion
    ];

    const response = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      {
        model: MODEL,
        messages: mensajesIA,
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
        stop: ["<|im_end|>", "<|im_start|>", "user:", "User:", "USER:", "Usuario:", "USUARIO:", "Human:"]
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    let respuesta = response.data.choices[0].message.content;
    respuesta = limpiarRespuesta(respuesta);
    
    cacheRespuestas.set(claveCaché, {
      respuesta,
      timestamp: Date.now()
    });
    
    if (cacheRespuestas.size > 100) {
      const primeraEntrada = cacheRespuestas.keys().next().value;
      cacheRespuestas.delete(primeraEntrada);
    }
    
    historialConversacion.push({
      role: "assistant",
      content: respuesta
    });

    return respuesta;
  } catch (error) {
    console.error("Error al conectar con la IA:", error.message);
    
    if (error.response) {
      console.error("Detalles del error:", error.response.data);
      
      if (error.response.status === 429) {
        return "Estamos experimentando mucho tráfico en este momento. Por favor, intenta de nuevo en unos minutos.";
      }
    }
    
    return "Lo siento, estoy teniendo problemas técnicos. ¿Podrías intentarlo más tarde?";
  }
};

const verificarConexion = async () => {
  try {
    await axios.get('https://api.together.xyz/v1/models', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    return true;
  } catch (error) {
    console.error("Error de conexión con la API:", error.message);
    return false;
  }
};

module.exports = {
  responderChat,
  reiniciarConversacion,
  verificarConexion
};