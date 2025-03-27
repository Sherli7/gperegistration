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
app.use('/public', express.static(path.join(__dirname, 'public')));
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

      // **📧 Email de confirmation utilisateur**
      const userMailOptions = {
        from: process.env.SMTP_CONTACTUSER,
        to: email,
        subject: 'Préinscription confirmée',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Confirmation de Préinscription</title>
          <style>
            body { background-color: #f4f4f4; margin: 0; padding: 0; font-family: 'Arial', sans-serif; }
            .email-container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; }
            .header { background-color: #042E68; color: #ffffff; text-align: center; padding: 20px; }
            .header h1 { font-size: 22px; margin: 0; font-weight: bold; }
            .content { padding: 20px; font-size: 16px; color: #333333; }
            .table-container { margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #042E68; color: white; }
            .footer { text-align: center; padding: 15px; font-size: 12px; color: #777777; background: #f4f4f4; }
            .footer a { color: #042E68; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>Confirmation de Préinscription</h1>
            </div>
      
            <div class="content">
              <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
              <p>Nous avons bien pris en compte votre sélection :</p>
      
              <div class="table-container">
                <h3>Formations sélectionnées</h3>
                <table>
                  <thead>
                    <tr><th>Formation</th></tr>
                  </thead>
                  <tbody>
                    ${formation_generale.map(formation => `<tr><td>${formation}</td></tr>`).join('')}
                  </tbody>
                </table>
              </div>
      
              <div class="table-container">
                <h3>Conférences sélectionnées</h3>
                <table>
                  <thead>
                    <tr><th>Thème</th><th>Conférencier</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    ${conference.map(conf => `<tr><td>${conf.theme}</td><td>${conf.speaker}</td><td>${conf.date}</td></tr>`).join('')}
                  </tbody>
                </table>
              </div>
      
              <p>Votre préinscription a été prise en compte.</p>
      
              <div class="footer">
                <p>Si vous avez des questions, contactez <a href="mailto:contact@gpe-cameroun.cm">contact@gpe-cameroun.cm</a>.</p>
              </div>
            </div>
          </div>
        </body>
        </html> 
        `,
      };
  
      // **📧 Email d'alerte admin**
      const adminMailOptions = {
        from: `"GPE Cameroun" <${process.env.SMTP_CONTACTUSER}>`,
        replyTo: `"Support GPE Cameroun" <contact@gpe-cameroun.cm>`,
        to: "contact@gpe-cameroun.cm",
        subject: "Nouvelle préinscription reçue",
        headers: {
          "X-Priority": "1", // Priorité haute
          "X-MSMail-Priority": "High",
          "Importance": "High",
        },
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Nouvelle préinscription</title>
          <style>
            body { background-color: #f4f4f4; margin: 0; padding: 0; font-family: 'Arial', sans-serif; }
            .email-container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; }
            .header { background-color: #042E68; color: #ffffff; text-align: center; padding: 20px; }
            .header h1 { font-size: 22px; margin: 0; font-weight: bold; }
            .content { padding: 20px; font-size: 16px; color: #333333; }
            .table-container { margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #042E68; color: white; }
            .footer { text-align: center; padding: 15px; font-size: 12px; color: #777777; background: #f4f4f4; }
            .footer a { color: #042E68; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>Nouvelle préinscription</h1>
            </div>
      
            <div class="content">
              <p><strong>Détails de la préinscription :</strong></p>
      
              <div class="table-container">
                <table>
                  <tr><th>Champ</th><th>Valeur</th></tr>
                  <tr><td><strong>Nom</strong></td><td>${nom}</td></tr>
                  <tr><td><strong>Prénom</strong></td><td>${prenom}</td></tr>
                  <tr><td><strong>Email</strong></td><td>${email}</td></tr>
                  <tr><td><strong>Téléphone</strong></td><td>${tel}</td></tr>
                  <tr><td><strong>Sexe</strong></td><td>${sexe}</td></tr>
                  <tr><td><strong>Organisation</strong></td><td>${organisation || 'Non renseignée'}</td></tr>
                  <tr><td><strong>Fonction</strong></td><td>${statut_fonction}</td></tr>
                  <tr><td><strong>Expérience</strong></td><td>${experience_years}</td></tr>
                  <tr><td><strong>Langue</strong></td><td>${langue_parlee}</td></tr>
                </table>
              </div>
      
              <div class="table-container">
                <h3>Formations sélectionnées</h3>
                <table>
                  <tr><th>Formation</th></tr>
                  ${formation_generale.map(formation => `<tr><td>${formation}</td></tr>`).join('')}
                </table>
              </div>
      
              <div class="table-container">
                <h3>Conférences sélectionnées</h3>
                <table>
                  <tr><th>Thème</th><th>Conférencier</th><th>Date</th></tr>
                  ${conference.map(conf => `<tr><td>${conf.theme}</td><td>${conf.speaker}</td><td>${conf.date}</td></tr>`).join('')}
                </table>
              </div>
            </div>
            <div class="footer">
              <p>Vous recevez cet email car une préinscription a été effectuée.</p>
              <p>Si besoin, contactez <a href="mailto:tech@domain.com">tech@domain.com</a>.</p>
            </div>
          </div>
        </body>
        </html>
        `,
  };

    // ✅ Envoi des emails en parallèle
    console.log("📧 Envoi des emails en cours...");
    try {
      await Promise.all([
        transporter.sendMail(userMailOptions),
        transporter.sendMail(adminMailOptions)
      ]);
      console.log("✅ Emails envoyés avec succès !");
    } catch (emailErr) {
      console.error("❌ Erreur lors de l'envoi des emails :", emailErr.message);
    }

    // Réponse après envoi des emails
    res.status(200).json({ success: true, id: inscriptionId });

  } catch (err) {
    console.error("🚨 Erreur lors de la préinscription :", err.message);
    res.status(500).json({ success: false, message: "Erreur lors de la préinscription : " + err.message });
  } finally {
    console.log("🗃 Fermeture de la connexion à la base.");
    pool.end();
  }
});


// Démarrer le serveur
app.listen(port, () => {
    console.log(`🚀 Serveur démarré sur http://${process.env.ADDRESS}:${port}`);
});
