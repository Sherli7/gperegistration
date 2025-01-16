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

// Configuration des middlewares
app.use(express.static('public'));
app.use(bodyParser.json());

// Configuration de Nodemailer
const transporter = nodemailer.createTransport({
  service: process.env.SERVICE,
  host: process.env.HOST,
  port: process.env.PORT,
  secure: false,  // Utilise STARTTLS pour le port 587
  auth: {
      user: process.env.SMTP_CONTACTUSER,
      pass: process.env.SMTP_CONTACTPASS,
  },
  tls: {
      rejectUnauthorized: false
  }
});

// Route principale
app.get('/', (req, res) => {
    if (fs.existsSync(configFilePath)) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.send('<h1>Installation requise !</h1><p>Accédez à <a href="/install">/install</a> pour configurer la base de données.</p>');
    }
});

// Route pour traiter l'installation
app.post('/install', async (req, res) => {
    const { host, port, database, user, password } = req.body;
    if (!host || !port || !database || !user || !password) {
        return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
    }

    const client = new Client({ user, host, password, port, database: 'postgres' });

    try {
        await client.connect();
        const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
        const result = await client.query(checkDbQuery, [database]);

        if (result.rowCount === 0) {
            await client.query(`CREATE DATABASE ${database}`);
        }
        await client.end();

        const pool = new Pool({ user, host, database, password, port });

        const createTableQuery = `
        CREATE TABLE IF NOT EXISTS inscriptions (
            id SERIAL PRIMARY KEY,
            nom VARCHAR(50),
            prenom VARCHAR(50),
            email VARCHAR(100),
            tel VARCHAR(15),
            sexe VARCHAR(10),
            date_naissance DATE,
            experience_years VARCHAR(20),
            organisation VARCHAR(100),
            statut_fonction VARCHAR(100),
            nationalite VARCHAR(50),
            pays_residence VARCHAR(50),
            langue_parlee VARCHAR(20),
            rubrique_formation TEXT[],
            dateInscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
        await pool.query(createTableQuery);

        fs.writeFileSync(configFilePath, JSON.stringify({ host, port, database, user, password }, null, 2));
        res.status(200).json({ success: true, message: 'Base de données et table créées avec succès.' });
    } catch (err) {
        console.error('Erreur:', err);
        res.status(500).json({ success: false, message: 'Erreur : ' + err.message });
    }
});

// Route pour gérer les inscriptions
app.post('/submit', async (req, res) => {
    if (!fs.existsSync(configFilePath)) {
        return res.status(500).json({ success: false, message: 'Base de données non configurée.' });
    }

    const dbConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    const pool = new Pool(dbConfig);

    const { nom, prenom, email, tel, sexe, date_naissance, experience_years, organisation, nationalite, pays_residence, langue_parlee, statut_fonction, rubrique_formation } = req.body;

    if (!nom || !email || !tel || !sexe || !date_naissance || !experience_years || !organisation || !nationalite || !pays_residence || !langue_parlee) {
        return res.status(400).json({ success: false, message: 'Tous les champs obligatoires doivent être remplis.' });
    }

    try {
        const result = await pool.query(`
            INSERT INTO inscriptions (nom, prenom, email, tel, sexe, date_naissance, experience_years, organisation, nationalite, pays_residence, langue_parlee, statut_fonction, rubrique_formation)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
            [nom, prenom, email, tel, sexe, date_naissance, experience_years, organisation, nationalite, pays_residence, langue_parlee, statut_fonction, rubrique_formation]
        );
        const inscriptionId = result.rows[0].id;

        // Envoyer un email de confirmation
        const userMailOptions = {
          from: process.env.SMTP_CONTACTUSER,
            to: email,
            subject: 'Préinscription confirmée',
            html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta http-equiv="x-ua-compatible" content="ie=edge">
              <title>Confirmation de Réservation</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body {
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 0;
                  font-family: 'Arial', sans-serif;
                }
                .email-container {
                  max-width: 600px;
                  margin: 20px auto;
                  background: #ffffff;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                  overflow: hidden;
                }
                .header {
                  background-color: #042E68;
                  color: #ffffff;
                  text-align: center;
                  padding: 20px;
                }
                .header img {
                  width: 80px;
                  margin-bottom: 10px;
                }
                .header h1 {
                  font-size: 24px;
                  margin: 0;
                  font-weight: bold;
                }
                .content {
                  padding: 20px;
                  font-size: 16px;
                  color: #333333;
                }
                .content p {
                  margin: 0 0 15px;
                }
                .cta {
                  text-align: center;
                  margin: 20px 0;
                }
                .cta a {
                  text-decoration: none;
                  background-color: #042E68;
                  color: #ffffff;
                  padding: 12px 24px;
                  border-radius: 6px;
                  font-size: 16px;
                  font-weight: bold;
                  display: inline-block;
                }
                .cta a:hover {
                  background-color: #3FA700;
                }
                .footer {
                  text-align: center;
                  padding: 10px;
                  font-size: 12px;
                  color: #777777;
                  background: #f4f4f4;
                  border-top: 1px solid #dddddd;
                }
                .footer a {
                  color: #042E68;
                  text-decoration: none;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <!-- Header -->
                <div class="header">
                  <img src="https://trainingpe.edocsflow.com/img/white_logo.jpg" alt="Logo GPE">
                  <h1>Confirmation de préinscription</h1>
                </div>
                <!-- Content -->
                <div class="content">
                  <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
                  <p>Nous avons bien pris en compte votre sélection :  <strong>${rubrique_formation.join('; ')}</strong>,</p>
                  <p>Votre préinscription a été prise en compte.</p>
                  <div class="cta">
                    <a href="https://www.gpe-cameroun.cm" target="_blank">Découvrez nos formations sur notre site web</a>
                  </div>
                  <p style="color: #777;">Nous vous contacterons bientôt pour finalisation.</p>
                </div>
                <!-- Footer -->
                <div class="footer">
                  <p>Vous recevez cet email parce que vous avez effectué une réservation sur notre plateforme de préinscription.</p>
                  <p>Si vous avez des questions, veuillez nous contacter à <a href="mailto:contact@gpe-cameroun.cm">contact@gpe-cameroun.cm</a>.</p>
                </div>
              </div>
            </body>
            </html>
        `,
        }; 

        const adminMailOptions = {
          from: process.env.SMTP_CONTACTUSER,
          to: 'contact@gpe-cameroun.cm',
          subject: 'Nouvelle préinscription',
          html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta http-equiv="x-ua-compatible" content="ie=edge">
            <title>Confirmation de Réservation</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
                font-family: 'Arial', sans-serif;
              }
              .email-container {
                max-width: 600px;
                margin: 20px auto;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                overflow: hidden;
              }
              .header {
                background-color: #042E68;
                color: #ffffff;
                text-align: center;
                padding: 20px;
              }
              .header img {
                width: 80px;
                margin-bottom: 10px;
              }
              .header h1 {
                font-size: 24px;
                margin: 0;
                font-weight: bold;
              }
              .content {
                padding: 20px;
                font-size: 16px;
                color: #333333;
              }
              .content p {
                margin: 0 0 15px;
              }
              .cta {
                text-align: center;
                margin: 20px 0;
              }
              .cta a {
                text-decoration: none;
                background-color: #042E68;
                color: #ffffff;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                display: inline-block;
              }
              .cta a:hover {
                background-color: #3FA700;
              }
              .footer {
                text-align: center;
                padding: 10px;
                font-size: 12px;
                color: #777777;
                background: #f4f4f4;
                border-top: 1px solid #dddddd;
              }
              .footer a {
                color: #042E68;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <!-- Header -->
              <div class="header">
                <img src="https://trainingpe.edocsflow.com/img/white_logo.jpg" alt="Logo GPE">
                <h1>Confirmation de Réservation</h1>
              </div>
              <!-- Content -->
              <div class="content">
                    <p><strong>${prenom} ${nom}</strong>, vient de se préinscrire. Voici les détails de sa préinscription :</p>
                    <ul>
                        <li><strong>Nom :</strong> ${nom}</li>
                        <li><strong>Prénom :</strong> ${prenom}</li>
                        <li><strong>Email :</strong> ${email}</li>
                        <li><strong>Téléphone :</strong> ${tel}</li>
                        <li><strong>Sexe :</strong> ${sexe}</li>
                        <li><strong>Organisation :</strong> ${organisation}</li>
                        <li><strong>Fonction / Statut :</strong> ${statut_fonction}</li>
                        <li><strong>Nombre d'années d'expérience pro :</strong> ${experience_years}</li>
                        <li><strong>Langue parlée :</strong> ${langue_parlee}</li>
                        <li><strong>Rubriques sélectionnées :</strong> ${rubrique_formation.join('; ')}</li>
                    </ul>
              </div>
              <!-- Footer -->
              <div class="footer">
                <p>Vous recevez cet email parce qu'un internaute a effectué une préinscription la plateforme de préinscription <a href="trainingpe.edocsflow.com">trainingpe.edocsflow.com</a>.</p>
                <p>Si vous avez des soucis avec cette plateforme, veuillez contancter <a href="mailto:lionelbiwole7@gmail.com">l'équipe technique</a>.</p>
              </div>
            </div>
          </body>
          </html>
          `,
      };

        await transporter.sendMail(userMailOptions);
        await transporter.sendMail(adminMailOptions);

        res.status(200).json({ success: true, id: inscriptionId });
    } catch (err) {
        console.error('Erreur lors de la préinscription:', err);
        res.status(500).json({ success: false, message: 'Erreur lors de la préinscription : ' + err.message });
    } finally {
        pool.end();
    }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
