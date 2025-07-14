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

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const text = m.message.conversation || m.message.extendedTextMessage?.text;
    if (!text) return;
    console.log('Recebido:', text);

    const resp = await gerarRespostaLocal(text);
    await sock.sendMessage(m.key.remoteJid, { text: resp });
  });
}

startBot();
