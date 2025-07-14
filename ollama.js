const axios = require('axios');
const host = process.env.OLLAMA_HOST || '127.0.0.1';
const port = process.env.OLLAMA_PORT || 11434;
const model = process.env.MODEL_NAME || 'phi3';

async function gerarRespostaLocal(prompt) {
  try {
    const resp = await axios.post(`http://${host}:${port}/v1/chat/completions`, {
      model,
      messages: [{ role: 'user', content: prompt }]
    });
    return resp.data.choices[0].message.content;
  } catch (e) {
    console.error('Erro Ollama:', e.message);
    return 'Desculpe, IA offline no momento.';
  }
}

module.exports = { gerarRespostaLocal };
