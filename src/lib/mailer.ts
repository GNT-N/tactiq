import nodemailer, { type Transporter } from 'nodemailer'

const HOST = process.env.SMTP_HOST
const PORT = Number(process.env.SMTP_PORT) || 587
const USER = process.env.SMTP_USER
const PASS = process.env.SMTP_PASSWORD
const FROM = process.env.SMTP_FROM || USER

export interface ResultatEnvoi {
  message_id: string
  destinataire: string
}

export function smtpConfigure() {
  return Boolean(HOST && USER && PASS)
}

// Le serveur est permanent (Render), donc on garde le transport ouvert
// plutôt que d'ouvrir une connexion SMTP à chaque email.
let transport: Transporter | null = null

function obtenirTransport() {
  if (transport) return transport

  transport = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    // 465 = TLS implicite ; 587 = STARTTLS négocié après connexion.
    secure: PORT === 465,
    requireTLS: PORT !== 465,
    auth: { user: USER, pass: PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })

  return transport
}

/**
 * Envoie réellement l'email. Lève une erreur explicite plutôt que de
 * renvoyer un succès silencieux : l'appelant ne doit jamais enregistrer
 * un envoi qui n'a pas eu lieu.
 */
export async function envoyerEmail(
  destinataire: string,
  sujet: string,
  corps: string,
): Promise<ResultatEnvoi> {
  if (!smtpConfigure()) {
    throw new Error('SMTP non configuré : renseigne SMTP_HOST, SMTP_USER et SMTP_PASSWORD')
  }

  const info = await obtenirTransport().sendMail({
    from: FROM,
    to: destinataire,
    subject: sujet,
    text: corps,
  })

  return { message_id: info.messageId, destinataire }
}

// Teste la connexion et l'authentification sans envoyer de message.
export async function verifierSmtp() {
  if (!smtpConfigure()) throw new Error('SMTP non configuré')
  await obtenirTransport().verify()
}
