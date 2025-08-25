import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';

// Email dell'amministratore che riceverà le notifiche
const ADMIN_EMAIL = "info.trend.app@gmail.com"; 

// Email da cui verranno inviate le notifiche
const SENDER_EMAIL = "noreply@trend-app.com";
const SENDER_NAME = "Trend App";

// Configurazione del client Brevo
const apiKey = process.env.BREVO_API_KEY;
let apiInstance: TransactionalEmailsApi | null = null;

/**
 * Configurazione dell'API di Brevo
 */
function setupBrevoApi() {
  if (!apiKey) {
    console.error("Brevo API key not found, user registration notifications won't be sent");
    return false;
  }

  try {
    apiInstance = new TransactionalEmailsApi();
    apiInstance.setApiKey('api-key', apiKey);
    
    console.log("Brevo API initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize Brevo API:", error);
    return false;
  }
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
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #0066cc; border-bottom: 1px solid #eee; padding-bottom: 10px;">Nuovo utente registrato su Trend</h2>
            <p>Un nuovo utente si è registrato all'applicazione Trend.</p>
            <h3 style="color: #333; margin-top: 20px;">Dettagli dell'utente:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">ID Utente:</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${userId}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Nome Utente:</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${username}</td>
              </tr>
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email:</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Password:</td>
                <td style="padding: 8px; border: 1px solid #ddd;">[NASCOSTA PER SICUREZZA]</td>
              </tr>
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Data di registrazione:</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${registrationDate}</td>
              </tr>
            </table>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">Queste informazioni sono state inviate automaticamente dal sistema.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
              Trend - Sentiment Market Tracker
            </div>
          </div>
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
    if (apiInstance) {
      await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`Notification sent: New user ${username} (${email}) registered`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error sending new user notification:', error);
    return false;
  }
}

// Inizializzazione del servizio
export function initNotificationService() {
  return setupBrevoApi();
}