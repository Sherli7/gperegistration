// Import des modules nécessaires
const express = require('express');
const bodyParser = require('body-parser');
const { Pool, Client } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const port = 3004;

// Chemin du fichier de configuration
const configFilePath = path.join(__dirname, 'db-config.json');
require('dotenv').config({ path: __dirname + '/.env' });
// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(bodyParser.json());

// Configuration de Nodemailer
const transporter = nodemailer.createTransport({
  service: process.env.SERVICE,
  host: process.env.HOST,
  port: process.env.PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_CONTACTUSER,
    pass: process.env.SMTP_CONTACTPASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Route principale
app.get('/', (req, res) => {
  if (fs.existsSync(configFilePath)) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.send('<h1>Installation requise !</h1><p>Accédez à <a href="/install">/install</a> pour configurer la base de données.</p>');
  }
});

// Route pour gérer les inscriptions
app.post('/submit', async (req, res) => {
  if (!fs.existsSync(configFilePath)) {
    return res.status(500).json({ success: false, message: 'Base de données non configurée.' });
  }

  const dbConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
  const pool = new Pool(dbConfig);

  const {
    nom,
    prenom,
    email,
    tel,
    sexe,
    date_naissance,
    experience_years,
    organisation,
    nationalite,
    pays_residence,
    langue_parlee,
    statut_fonction,
    formation_generale,
    conference,
  } = req.body;

  console.log("📩 Données reçues :", req.body);

  // Validation des champs obligatoires
  const errors = [];
  if (!nom) errors.push("Le champ 'nom' est requis.");
  if (!email) errors.push("Le champ 'email' est requis.");
  if (!tel) errors.push("Le champ 'tel' est requis.");
  if (!sexe) errors.push("Le champ 'sexe' est requis.");
  if (!date_naissance) errors.push("Le champ 'date_naissance' est requis.");
  if (!experience_years) errors.push("Le champ 'experience_years' est requis.");
  if (!statut_fonction) errors.push("Le champ 'statut_fonction' est requis.");
  if (!nationalite) errors.push("Le champ 'nationalite' est requis.");
  if (!pays_residence) errors.push("Le champ 'pays_residence' est requis.");
  if (!langue_parlee) errors.push("Le champ 'langue_parlee' est requis.");
  if (!Array.isArray(formation_generale) || formation_generale.length === 0) {
    errors.push("Veuillez sélectionner au moins une formation générale.");
  }
  if (!Array.isArray(conference) || conference.length === 0) {
    errors.push("Veuillez sélectionner au moins une conférence.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(' ') });
  }

  try {
    // Vérifier si l'utilisateur existe déjà
    const checkUserQuery = `SELECT id FROM inscriptions WHERE email = $1`;
    const userResult = await pool.query(checkUserQuery, [email]);

    if (userResult.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'Un utilisateur avec cet email existe déjà.' });
    }

    // Retrieve indicatif_pays from req.body for the email
    const { indicatif_pays } = req.body;

    // Insérer les données dans la base
    const insertQuery = `
      INSERT INTO inscriptions (
        nom, prenom, email, tel, sexe, date_naissance, experience_years, organisation,
        nationalite, pays_residence, langue_parlee, statut_fonction, formation_generale, conference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;
    const values = [
      nom, prenom, email, tel, sexe, date_naissance, experience_years, organisation || null,
      nationalite, pays_residence, langue_parlee, statut_fonction, formation_generale, JSON.stringify(conference),
    ];

    const result = await pool.query(insertQuery, values);
    const inscriptionId = result.rows[0].id;
    console.log("✅ Préinscription enregistrée avec ID :", inscriptionId);

    // Helper function to escape HTML special characters (Moved BEFORE usage)
    const escapeHtml = (unsafe) => {
      if (typeof unsafe !== 'string') return unsafe;
      return unsafe
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#039;");
    };

    // **📧 Email de confirmation utilisateur (Nouveau Template)**
    const userMailOptions = {
      from: process.env.SMTP_CONTACTUSER,
      to: email,
      subject: 'Confirmation de votre Préinscription', // Objet clair
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmation de votre Préinscription</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; font-size: 16px; line-height: 1.6; color: #333333; }
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          p { margin: 1em 0; }
          a { color: #042E68; text-decoration: underline; }
          h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; color: #042E68; font-weight: bold; }
          h1 { font-size: 24px; }
          h3 { font-size: 18px; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; }
          .section-title { color: #042E68; font-size: 18px; font-weight: bold; margin-bottom: 15px; margin-top: 25px; border-bottom: 2px solid #042E68; padding-bottom: 8px;}
          ul { padding-left: 25px; margin-top: 0; margin-bottom: 1em;}
          li { margin-bottom: 8px; }
          .info-table { width: 100%; margin-bottom: 20px; border: 1px solid #dfe3e8; }
          .info-table td, .info-table th { padding: 10px 12px; border-bottom: 1px solid #dfe3e8; vertical-align: top; font-size: 14px; text-align: left;}
          .info-table th { background-color: #f8f9fa; color: #333; font-weight: bold; border-bottom-width: 2px; }
          .info-table tr:last-child td { border-bottom: none; }
          .footer { text-align: center; padding: 25px; font-size: 12px; color: #777777; background-color: #f0f4f7; border-top: 1px solid #e0e0e0; }
          .footer p { margin: 0.5em 0; }
          .footer a { color: #042E68; text-decoration: none; }
        </style>
      </head>
      <body style="background-color:#f4f4f4; margin:0; padding:0; font-family: Arial, Helvetica, sans-serif;">
        <div class="container" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #042E68;">
            <tr>
              <td style="padding: 25px; text-align: center;">
                <!-- LOGO Placeholder -->
                <!-- <img src="URL_DU_LOGO_GPE" alt="GPE Cameroun Logo" width="90" style="display: block; margin: 0 auto 10px auto; max-width: 100px;"> -->
                 <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: bold; line-height: 1.2;">
                   Confirmation de votre Préinscription
                 </h1>
              </td>
            </tr>
          </table>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 30px 25px; color: #333333; font-size: 16px; line-height: 1.6;">
                <p style="margin-top: 0;">Bonjour <strong>${escapeHtml(prenom || '')} ${escapeHtml(nom || '')}</strong>,</p>
                <p>Nous avons bien reçu votre demande de préinscription pour les formations et conférences suivantes. Nous vous remercions de votre intérêt.</p>
                <h3 class="section-title">Formations Sélectionnées</h3>
                <ul style="padding-left: 25px; margin-top: 0;">
                  ${(formation_generale && Array.isArray(formation_generale)) ? formation_generale.map(f => `<li style="margin-bottom: 8px;">${escapeHtml(f)}</li>`).join('') : '<li>Aucune formation sélectionnée</li>'}
                </ul>
                <h3 class="section-title">Conférences Sélectionnées</h3>
                <table class="info-table" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                   <thead>
                     <tr style="background-color: #f8f9fa;">
                       <th style="padding: 10px 12px; border-bottom: 2px solid #dfe3e8; color: #333; font-weight: bold; text-align: left; font-size: 14px;">Thème</th>
                       <th style="padding: 10px 12px; border-bottom: 2px solid #dfe3e8; color: #333; font-weight: bold; text-align: left; font-size: 14px;">Intervenant</th>
                       <th style="padding: 10px 12px; border-bottom: 2px solid #dfe3e8; color: #333; font-weight: bold; text-align: left; font-size: 14px;">Date</th>
                     </tr>
                   </thead>
                   <tbody>
                      ${(conference && Array.isArray(conference)) ? conference.map(c => `
                        <tr>
                          <td style="padding: 10px 12px; border-bottom: 1px solid #dfe3e8; font-size: 14px;">${escapeHtml(c.theme || '')}</td>
                          <td style="padding: 10px 12px; border-bottom: 1px solid #dfe3e8; font-size: 14px;">${escapeHtml(c.speaker || '')}</td>
                          <td style="padding: 10px 12px; border-bottom: 1px solid #dfe3e8; font-size: 14px;">${escapeHtml(c.date || '')}</td>
                        </tr>`).join('') : '<tr><td colspan="3">Aucune conférence sélectionnée</td></tr>'}
                   </tbody>
                </table>
                <p style="font-size: 14px; color: #555555; margin-top: 25px;">Cette confirmation a été envoyée à l'adresse : ${escapeHtml(email || '')}</p>
                <p>Vous recevrez prochainement plus d'informations concernant les prochaines étapes. Si vous avez des questions, n'hésitez pas à nous contacter.</p>
              </td>
            </tr>
          </table>
          <div class="footer" style="text-align: center; padding: 25px; font-size: 12px; color: #777777; background-color: #f0f4f7; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0.5em 0;">GPE Cameroun - <a href="mailto:contact@gpe-cameroun.cm" style="color: #042E68; text-decoration: none;">contact@gpe-cameroun.cm</a></p>
            <p style="margin: 0.5em 0;">&copy; ${new Date().getFullYear()} GPE Cameroun. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
      `,
    };

    // **📧 Email d'alerte admin (Nouveau Template)**
    const adminMailOptions = {
      from: `\"GPE Cameroun\" <${process.env.SMTP_CONTACTUSER}>`,
      replyTo: `\"Support GPE Cameroun\" <contact@gpe-cameroun.cm>`,
      to: "contact@gpe-cameroun.cm", // Adresse admin
      subject: `Nouvelle Préinscription - ${escapeHtml(nom || '')} ${escapeHtml(prenom || '')}`, // Use escapeHtml here too
      headers: { /* ... existing headers ... */ },
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nouvelle Préinscription Reçue</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; font-size: 16px; line-height: 1.6; color: #333333; }
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          p { margin: 1em 0; }
          a { color: #042E68; text-decoration: underline; }
          h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; color: #042E68; font-weight: bold; }
          h1 { font-size: 24px; }
          h3 { font-size: 18px; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; }
          .section-title { color: #042E68; font-size: 18px; font-weight: bold; margin-bottom: 15px; margin-top: 25px; border-bottom: 2px solid #042E68; padding-bottom: 8px;}
          ul { padding-left: 25px; margin-top: 0; margin-bottom: 1em;}
          li { margin-bottom: 8px; }
          .info-table { width: 100%; margin-bottom: 20px; border: 1px solid #dfe3e8; }
          .info-table td, .info-table th { padding: 10px 12px; border-bottom: 1px solid #dfe3e8; vertical-align: top; font-size: 14px; text-align: left;}
          .info-table th { background-color: #f8f9fa; color: #333; font-weight: bold; border-bottom-width: 2px; width: 150px; }
          .info-table tr:last-child td { border-bottom: none; }
          .footer { text-align: center; padding: 25px; font-size: 12px; color: #777777; background-color: #f0f4f7; border-top: 1px solid #e0e0e0; }
          .footer p { margin: 0.5em 0; }
          .footer a { color: #042E68; text-decoration: none; }
        </style>
      </head>
      <body style="background-color:#f4f4f4; margin:0; padding:0; font-family: Arial, Helvetica, sans-serif;">
        <div class="container" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #042E68;">
            <tr>
              <td style="padding: 25px; text-align: center;">
                 <!-- LOGO Placeholder -->
                 <!-- <img src="URL_DU_LOGO_GPE" alt="GPE Cameroun Logo" width="90" style="display: block; margin: 0 auto 10px auto; max-width: 100px;"> -->
                 <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: bold; line-height: 1.2;">
                   Nouvelle Préinscription Reçue
                 </h1>
              </td>
            </tr>
          </table>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 30px 25px; color: #333333; font-size: 16px; line-height: 1.6;">
                <p style="margin-top: 0;">Une nouvelle demande de préinscription a été soumise. Voici les détails :</p>
                <h3 class="section-title">Détails du Contact</h3>
                <table class="info-table" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                   <tbody>
                     <tr><th style="...">Nom :</th><td style="..."> ${escapeHtml(nom || '')}</td></tr>
                     <tr><th style="...">Prénom :</th><td style="..."> ${escapeHtml(prenom || '')}</td></tr>
                     <tr><th style="...">Email :</th><td style="..."> ${escapeHtml(email || '')}</td></tr>
                     <tr><th style="...">Téléphone :</th><td style="..."> ${escapeHtml(indicatif_pays || '')} ${escapeHtml(tel || '')}</td></tr>
                     <tr><th style="...">Sexe :</th><td style="..."> ${escapeHtml(sexe || '')}</td></tr>
                     <tr><th style="...">Date Naissance :</th><td style="..."> ${escapeHtml(date_naissance || '')}</td></tr>
                     <tr><th style="...">Nationalité :</th><td style="..."> ${escapeHtml(nationalite || '')}</td></tr>
                     <tr><th style="...">Pays Résidence :</th><td style="..."> ${escapeHtml(pays_residence || '')}</td></tr>
                     <tr><th style="...">Organisation :</th><td style="..."> ${escapeHtml(organisation || 'N/A')}</td></tr>
                     <tr><th style="...">Fonction :</th><td style="..."> ${escapeHtml(statut_fonction || '')}</td></tr>
                     <tr><th style="...">Expérience :</th><td style="..."> ${escapeHtml(experience_years || '')}</td></tr>
                     <tr><th style="...">Langue :</th><td style="..."> ${escapeHtml(langue_parlee || '')}</td></tr>
                   </tbody>
                </table>
                <h3 class="section-title">Formations Sélectionnées</h3>
                <ul style="padding-left: 25px; margin-top: 0;">
                  ${(formation_generale && Array.isArray(formation_generale)) ? formation_generale.map(f => `<li style="margin-bottom: 8px;">${escapeHtml(f)}</li>`).join('') : '<li>Aucune</li>'}
                </ul>
                <h3 class="section-title">Conférences Sélectionnées</h3>
                <table class="info-table" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                   <thead>
                     <tr style="background-color: #f8f9fa;">
                       <th style="padding: 10px 12px; border-bottom: 2px solid #dfe3e8; color: #333; font-weight: bold; text-align: left; font-size: 14px;">Thème</th>
                       <th style="padding: 10px 12px; border-bottom: 2px solid #dfe3e8; color: #333; font-weight: bold; text-align: left; font-size: 14px;">Intervenant</th>
                       <th style="padding: 10px 12px; border-bottom: 2px solid #dfe3e8; color: #333; font-weight: bold; text-align: left; font-size: 14px;">Date</th>
                     </tr>
                   </thead>
                   <tbody>
                    ${(conference && Array.isArray(conference)) ? conference.map(c => `
                      <tr>
                        <td style="padding: 10px 12px; border-bottom: 1px solid #dfe3e8; font-size: 14px;">${escapeHtml(c.theme || '')}</td>
                        <td style="padding: 10px 12px; border-bottom: 1px solid #dfe3e8; font-size: 14px;">${escapeHtml(c.speaker || '')}</td>
                        <td style="padding: 10px 12px; border-bottom: 1px solid #dfe3e8; font-size: 14px;">${escapeHtml(c.date || '')}</td>
                      </tr>`).join('') : '<tr><td colspan="3">Aucune</td></tr>'}
                   </tbody>
                </table>
                <p style="margin-top: 30px;">Veuillez traiter cette demande.</p>
              </td>
            </tr>
          </table>
          <div class="footer" style="text-align: center; padding: 25px; font-size: 12px; color: #777777; background-color: #f0f4f7; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0.5em 0;">Notification générée par le système de préinscription.</p>
            <p style="margin: 0.5em 0;">&copy; ${new Date().getFullYear()} GPE Cameroun.</p>
          </div>
        </div>
      </body>
      </html>
      `,
    };

    // Envoyer les emails
    try {
      let infoUser = await transporter.sendMail(userMailOptions);
      console.log('✅ Email utilisateur envoyé : %s', infoUser.messageId);
      let infoAdmin = await transporter.sendMail(adminMailOptions);
      console.log('✅ Email admin envoyé : %s', infoAdmin.messageId);
    } catch (mailError) {
      console.error('🚨 Erreur lors de l\'envoi de l\'email :', mailError);
      // Important : NE PAS bloquer l'utilisateur si l'email échoue, l'inscription est faite.
      // On pourrait logguer l'erreur plus en détail ici pour investigation.
      // On renvoie quand même une réponse de succès à l'utilisateur.
    }

    res.status(200).json({ success: true, message: 'Préinscription enregistrée avec succès ! Email de confirmation envoyé.' });

  } catch (error) {
    console.error("🚨 Erreur lors de la préinscription ou de l'envoi d'email :", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." }); // Generic message
  } finally {
    console.log("🗃 Fermeture de la connexion à la base.");
    pool.end();
  }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`🚀 Serveur démarré sur http://${process.env.ADDRESS}:${port}`);
});
