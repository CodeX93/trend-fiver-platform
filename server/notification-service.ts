import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';

// Configurazione del client Brevo
const apiKey = process.env.BREVO_API_KEY;
let apiInstance: TransactionalEmailsApi;

// Email dell'amministratore che riceverà le notifiche
// Utilizzare l'indirizzo che ti verrà fornito dall'utente
const ADMIN_EMAIL = "info.trend.app@gmail.com"; 

// Email da cui verranno inviate le notifiche
const SENDER_EMAIL = "noreply@trend-app.com";
const SENDER_NAME = "Trend App";

// Configurazione dell'API di Brevo
function setupBrevoApi() {
  if (!apiKey) {
    console.error("Brevo API key not found, user registration notifications won't be sent");
    return false;
  }

  apiInstance = new TransactionalEmailsApi();
  // Configurazione del client con l'apiKey
  apiInstance.setApiKey('api-key', apiKey);
  
  return true;
}

/**
 * Invia una notifica via email all'amministratore quando un nuovo utente si registra
 * @param userId ID dell'utente
 * @param username Nome utente
 * @param email Indirizzo email dell'utente
 */
export async function sendNewUserNotification(userId: number, username: string, email: string): Promise<boolean> {
  try {
    // Se l'API non è stata configurata, tenta di configurarla
    if (!apiInstance && !setupBrevoApi()) {
      return false;
    }

    // Data di registrazione formattata
    const registrationDate = new Date().toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });

    // Crea l'oggetto per l'invio dell'email
    const sendSmtpEmail = new SendSmtpEmail();
    
    sendSmtpEmail.subject = `Nuovo utente registrato su Trend: ${username}`;
    sendSmtpEmail.htmlContent = `
      <html>
        <body>
          <h2>Nuovo utente registrato su Trend</h2>
          <p>Un nuovo utente si è registrato all'applicazione Trend.</p>
          <h3>Dettagli dell'utente:</h3>
          <ul>
            <li><strong>ID Utente:</strong> ${userId}</li>
            <li><strong>Nome Utente:</strong> ${username}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Password:</strong> [NASCOSTA PER SICUREZZA]</li>
            <li><strong>Data di registrazione:</strong> ${registrationDate}</li>
          </ul>
          <p>Queste informazioni sono state inviate automaticamente dal sistema.</p>
          <p>Trend - Sentiment Market Tracker</p>
        </body>
      </html>
    `;
    
    sendSmtpEmail.sender = {
      name: SENDER_NAME,
      email: SENDER_EMAIL
    };
    
    sendSmtpEmail.to = [{
      email: ADMIN_EMAIL,
      name: 'Admin'
    }];

    // Invia l'email
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`Notification sent: New user ${username} (${email}) registered`);
    return true;
  } catch (error) {
    console.error('Error sending new user notification:', error);
    return false;
  }
}

// Inizializzazione del servizio
export function initNotificationService() {
  return setupBrevoApi();
}