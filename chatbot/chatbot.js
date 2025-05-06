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
  let textoLimpio = respuesta.replace(/<\|im_end\|>|<\|im_start\|>|<\|.*?\|>/g, '');
  
  textoLimpio = textoLimpio.replace(/```.*?```/gs, '').trim();
  
  textoLimpio = textoLimpio.replace(/user:.*|assistant:.*|humano:.*|usuario:.*|system:.*/gi, '').trim();
  
  const posiblesPreguntasUsuario = textoLimpio.match(/\?.*quiero adoptar|\?.*busco|\?.*necesito/i);
  if (posiblesPreguntasUsuario) {
    textoLimpio = textoLimpio.substring(0, textoLimpio.indexOf(posiblesPreguntasUsuario[0]) + 1);
  }

  const lineas = textoLimpio.split('\n');
  if (lineas.length > 5) {
    textoLimpio = lineas.slice(0, 5).join('\n');
  }

  if (textoLimpio.length > 400) {
    textoLimpio = textoLimpio.substring(0, 400);
    const ultimoEspacio = textoLimpio.lastIndexOf(' ');
    if (ultimoEspacio > 350) {
      textoLimpio = textoLimpio.substring(0, ultimoEspacio);
    }
  }

  textoLimpio = formatearListasEnumeradas(textoLimpio);

  return textoLimpio;
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
        "content": "Eres PetBot, asistente del refugio PetConnect en Perú. IMPORTANTE: Tus respuestas DEBEN ser ULTRA CONCISAS (máximo 250 caracteres en total). Para listas, usa SIEMPRE formato numerado con un máximo de 3 puntos, cada uno con UNA SOLA ORACIÓN breve. Ejemplo de respuesta correcta: 'Los gatos necesitan:\n1. Vacuna triple felina anual\n2. Desparasitación cada 3 meses\n3. Revisión veterinaria semestral'. Nunca uses explicaciones largas. Sé directo y específico. Evita saludos extensos o cierres. Céntrate solo en la información esencial. Si el usuario pide más información, responde solo lo solicitado sin añadir contenido extra."
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