// Import des modules nécessaires
const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const { Pool, Client } = require('pg');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const port = 3004;

// Chemin du fichier de configuration
//const configFilePath = path.join(__dirname, 'db-config.json');

// Configuration des middlewares
app.use(express.static('public')); // Servir les fichiers statiques dans le dossier 'public'
app.use(bodyParser.json()); // Pour traiter les requêtes JSON


// Route principale pour afficher le formulaire ou demander l'installation
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configurer Nodemailer
const transporter = nodemailer.createTransport({
    service: process.env.service,
    host: process.env.HOST,
    port: process.env.PORT ,
    secure: false,
    auth: {
        user: process.env.USER,
        pass: process.env.PASSWORD,
    },
});

// Route pour traiter les paramètres d'installation
app.post('/install', async (req, res) => {
    const {database} = req.body;

    if (!database) {
        return res.status(400).json({ success: false, message: 'Le  champs database est requis.' });
    }

// Connexion à la base de données
const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: 'postgres', // ou une autre base par défaut si nécessaire
});

    try {
        await client.connect();

        // Vérifier si la base de données existe
        const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
        const result = await client.query(checkDbQuery, [database]);

        if (result.rowCount === 0) {
            // Créer la base de données si elle n'existe pas
            const createDbQuery = `CREATE DATABASE ${database}`;
            await client.query(createDbQuery);
        }

        await client.end();

        // Connexion à la base de données pour créer la table
        const pool = new Pool({
          user: process.env.DB_USER,
          host: process.env.DB_HOST,
          database,
          password: process.env.DB_PASSWORD,
          port: process.env.DB_PORT,
      });

        const createTableQuery = `
        CREATE TABLE IF NOT EXISTS inscription (
            id SERIAL PRIMARY KEY,
            nom VARCHAR(50),
            prenom VARCHAR(50),
            email VARCHAR(100),
            tel VARCHAR(15),
            sexe VARCHAR(10),
            date_naissance DATE,
            experience_years VARCHAR(20),
            entreprise VARCHAR(100),
            statut_fonction (50),
            nationalite VARCHAR(50),
            pays_residence VARCHAR(50),
            langue_parlee VARCHAR(20),
            formation_interessee VARCHAR(100),
            autreformation VARCHAR(20),
            dateInscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        `;

        await pool.query(createTableQuery);

        res.status(200).json({ success: true, message: 'La base de données et la table ont été créées avec succès.' });
    } catch (err) {
        console.error('Erreur lors de l\'installation:', err);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'installation : ' + err.message });
    }
});

// Route pour gérer les inscriptions
app.post('/submit', async (req, res) => {
  const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: req.body.database || process.env.DB_NAME, // Utiliser le nom de la base par défaut ou celui fourni
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};

    const pool = new Pool(dbConfig);

    const { nom, prenom, email, tel, sexe, date_naissance, experience_years, entreprise, nationalite, pays_residence, langue_parlee,formation_interessee,autreformation } = req.body;

    if (!nom || !email || !tel || !sexe  || !date_naissance || !experience_years || !entreprise || !nationalite || !pays_residence || !langue_parlee || !formation_interessee) {
        return res.status(400).json({ success: false, message: 'Tous les champs obligatoires doivent être remplis.' });
    }
    
    try {
        // Insérer les données dans la base
        const result = await pool.query(
          `INSERT INTO inscription (nom, prenom, email, tel, sexe, date_naissance, experience_years, entreprise, nationalite, pays_residence, langue_parlee,formation_interessee,autreformation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,$13) RETURNING id`,
          [nom, prenom, email, tel, sexe, date_naissance, experience_years, entreprise, nationalite, pays_residence, langue_parlee,formation_interessee,autreformation]
      );

        const inscriptionId = result.rows[0].id;

        // Envoyer un email de confirmation
        const userMailOptions = {
            from: {
              name:"Inscription GPE CAMEROUN",
              address:process.env.USER
            },
            to: email,
            subject: 'Confirmation préinscription',
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
                  <img src="https://trainingpe.edocsflow.com/img/logo blanc.jpg" alt="Logo GPE">
                  <h1>Confirmation de Réservation</h1>
                </div>
                <!-- Content -->
                <div class="content">
                  <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
                  <p>Merci pour votre réservation.</p>
                  <div class="cta">
                    <a href="https://www.gpe-cameroun.cm" target="_blank">Découvrez nos formations sur notre site web</a>
                  </div>
                  <p style="color: #777;">Nous vous contacterons bientôt pour plus d'informations.</p>
                </div>
                <!-- Footer -->
                <div class="footer">
                  <p>Vous recevez cet email parce que vous avez effectué une réservation sur notre plateforme d'inscription.</p>
                  <p>Si vous avez des questions, veuillez nous contacter à <a href="mailto:contact@gpe-cameroun.cm">contact@gpe-cameroun.cm</a>.</p>
                </div>
              </div>
            </body>
            </html>
        `,
        };

        const adminMailOptions = {
            from: process.env.USER,
            to: process.env.USER,
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
                  <img src="https://trainingpe.edocsflow.com/img/logo.png" alt="Logo GPE">
                  <h1>Confirmation de Réservation</h1>
                </div>
                <!-- Content -->
                <div class="content">
                  <p><strong>${prenom} ${nom}</strong>, vient de s'inscrire. Voici les détails de son inscription:,</p>
                 <ul>
                <li><strong>Nom :</strong> ${nom}</li>
                <li><strong>Prénom :</strong> ${prenom}</li>
                <li><strong>Email :</strong> ${email}</li>
                <li><strong>Téléphone :</strong> ${tel}</li>
                <li><strong>Sexe :</strong> ${sexe}</li>
                </ul>
                  <p>Merci pour votre réservation.</p>
                  <div class="cta">
                    <a href="https://www.gpe-cameroun.cm" target="_blank">Découvrez nos formations sur notre site web</a>
                  </div>
                  <p style="color: #777;">Nous vous contacterons bientôt pour plus d'informations.</p>
                </div>
                <!-- Footer -->
                <div class="footer">
                  <p>Vous recevez cet email parce que vous avez effectué une réservation sur notre plateforme d'inscription.</p>
                  <p>Si vous avez des questions, veuillez nous contacter à <a href="mailto:contact@gpe-cameroun.cm">contact@gpe-cameroun.cm</a>.</p>
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
        console.error('Erreur lors de l\'inscription:', err);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'inscription : ' + err.message });
    } finally {
        pool.end();
    }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
