require('dotenv').config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { gerarRespostaLocal } = require('./ollama');

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('auth');

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (upd) => {
    const { connection, lastDisconnect, qr } = upd;
    if (qr) {
      console.log('📱 Escaneie este QR code:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const code = lastDisconnect.error?.output?.statusCode;
      console.log('❌ Conexão encerrada!', code);
      if (code !== DisconnectReason.loggedOut) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot conectado com sucesso!');
    }
  });

const { salvarAtendimento } = require('./salvarDados');

sock.ev.on('messages.upsert', async ({ messages }) => {
  const m = messages[0];
  if (!m.message || m.key.fromMe) return;

  const jid = m.key.remoteJid;

  // --- ADIÇÃO CRÍTICA AQUI ---
  // Verifica se o JID (identificador do chat) termina com '@g.us'.
  // Se for um grupo, a função retorna imediatamente e o bot não responde.
  if (jid.endsWith('@g.us')) {
    console.log(`Mensagem de grupo ignorada: ${jid}`);
    return;
  }
  // ---------------------------
  
  const text = (m.message.conversation || m.message.extendedTextMessage?.text || '').trim().toLowerCase();

  console.log('Recebido:', text);

  const nome = m.pushName || 'Cliente';
  const data = new Date().toLocaleString();

  // MENU
  if (text === '/menu' || text.includes('oi') || text.includes('olá')) {
    const menu = `🤖 Olá, ${nome}! Bem-vindo ao escritório Daniel Duhau.

Como posso te ajudar hoje?  
1️⃣ Falar com o advogado  
2️⃣ Agendar uma consulta  
3️⃣ Consultar processo  
4️⃣ Dúvidas sobre dívidas ou cobranças  
5️⃣ Outros assuntos  

Digite o número da opção desejada.`;
    await sock.sendMessage(jid, { text: menu });
    return;
  }

  // FLUXO
  if (text === '1') {
    await sock.sendMessage(jid, { text: '📞 O advogado será notificado. Por favor, informe seu nome completo e resumo do caso.' });
    return;
  }

  if (text === '2') {
    await sock.sendMessage(jid, {
      text: `📅 Para agendar, utilize o link abaixo:  
🔗 [Agendar Consulta](https://calendar.google.com/calendar/u/0/r/eventedit?text=Consulta+Jurídica+com+Daniel+Duhau&dates=&details=Informe+seus+dados+no+campo+de+descrição&location=Online&sf=true)  
\nApós agendar, por favor confirme aqui.`
    });
    return;
  }

  if (text === '3') {
    await sock.sendMessage(jid, { text: '📂 Informe seu CPF ou número do processo para verificar o andamento.' });
    return;
  }

  if (text === '4' || text === '5') {
    await sock.sendMessage(jid, { text: '✍️ Por favor, descreva sua dúvida que vamos analisar.' });
    return;
  }

  // Fallback com IA + salvar
  const resposta = await gerarRespostaLocal(text);
  await sock.sendMessage(jid, { text: resposta });

  salvarAtendimento({
    nome,
    numero: jid,
    mensagem: text,
    resposta,
    data
  });
});


}

startBot();
