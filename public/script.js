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
const transporter = nodemailer.createTransporter({
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
    conference, // accept optional conference payload if present
    indicatif_pays, // optional, ignored for now (add column if needed)
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

    // Construire insertion dynamiquement pour éviter mismatch entre colonnes et placeholders
    const columns = [
      'nom','prenom','email','tel','sexe','date_naissance','experience_years','organisation',
      'nationalite','pays_residence','langue_parlee','statut_fonction'
    ];

    const values = [
      nom, prenom, email, tel, sexe, date_naissance, experience_years, organisation || null,
      nationalite, pays_residence, langue_parlee, statut_fonction
    ];

    // Colonnes traitées comme JSON dans la DB (seulement conference est jsonb)
    const jsonCols = new Set(['conference']);

    // Ajouter formation_generale (obligatoire) — passer directement le tableau JS (pg gère l'array)
    columns.push('formation_generale');
    values.push(formation_generale);

    // Ajouter conference si fourni et non vide (optionnel, jsonb)
    let conferenceIndex = -1;
    if (Array.isArray(conference) && conference.length > 0) {
      columns.push('conference');
      values.push(JSON.stringify(conference)); // string pour jsonb
      conferenceIndex = values.length - 1;
    }

    // Construire placeholders (seulement ::jsonb pour conference)
    const placeholders = values.map((_, i) => {
      const col = columns[i];
      return jsonCols.has(col) ? `$${i + 1}::jsonb` : `$${i + 1}`;
    });

    const insertQuery = `
      INSERT INTO inscriptions (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING id
    `;

    console.log('DEBUG insertQuery:', insertQuery.replace(/\s+/g, ' '));
    console.log('DEBUG values.length/type:', values.length, values.map(v => typeof v));

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
        "X-Priority": "1",
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
          </div>
          <div class="footer">
            <p>Vous recevez cet email car une préinscription a été effectuée.</p>
            <p>Si besoin, contactez <a href="mailto:contact@gpe-cameroun.cm">contact@gpe-cameroun.cm</a>.</p>
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
    console.error("🚨 Erreur lors de la préinscription :", err); // Log full err for better debugging
    res.status(500).json({ success: false, message: "Erreur lors de la préinscription : " + (err.message || 'Erreur inconnue (vérifiez les logs serveur)') });
  } finally {
    console.log("🗃 Fermeture de la connexion à la base.");
    await pool.end(); // Use await for proper async close
  }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`🚀 Serveur démarré sur http://${process.env.ADDRESS}:${port}`);
});

// Fonction pour basculer l'affichage des listes déroulantes
function toggleDropdown(id) {
    console.log(`toggleDropdown called for ID: ${id}`);
    const dropdownContent = document.getElementById(id);
    if (dropdownContent) {
        const titleElement = dropdownContent.previousElementSibling;
        if (titleElement) {
            // Toggle the .open class on both title and content
            const isOpen = dropdownContent.classList.toggle('open');
            titleElement.classList.toggle('open', isOpen);
            console.log(`Toggled .open class. Is now open: ${isOpen}`);
            // No need to manually change icon, CSS handles it via .open class
        } else {
            console.error(`Could not find title element for dropdown ID: ${id}`);
        }
    } else {
        console.error(`Élément avec l'ID "${id}" introuvable.`);
    }
}

// Fonction pour afficher/masquer le loader
function toggleLoader(show) {
    const loader = document.getElementById("loader");
    if (!loader) {
        console.error("Loader introuvable dans le DOM.");
        return;
    }
    loader.style.display = show ? "block" : "none";
}

// Fonction pour désactiver/activer le bouton Submit
function toggleButtonState(disabled) {
    const submitButton = document.querySelector("button[type='submit']");
    if (submitButton) {
        submitButton.disabled = disabled;
        submitButton.style.cursor = disabled ? "not-allowed" : "pointer";
        submitButton.style.opacity = disabled ? "0.7" : "1";
    }
}

// Fonction pour afficher un Toast sans dépendance
function showToast(message, type = "info", autoHide = true) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);

    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    toast.style.backgroundColor = type === "success" ? "#28a745" : (type === "error" ? "#dc3545" : "#6c757d");
    toast.style.color = "#fff";
    toast.style.padding = "12px 20px";
    toast.style.borderRadius = "5px";
    toast.style.zIndex = "10000";
    toast.style.opacity = "1";
    toast.style.transition = "opacity 0.5s ease";
    toast.style.maxWidth = "350px";
    toast.style.fontSize = "15px";

    const returnLink = toast.querySelector('#returnToSiteLink');
    if (returnLink && !autoHide) {
        returnLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Retour au site principal demandé...");
            try {
                window.location.href = 'https://gpe-cameroun.cm';
            } catch(redirError) {
                console.error("Erreur de redirection: ", redirError);
            }
            try {
                setTimeout(() => window.close(), 150);
            } catch(closeError) {
                console.error("Erreur lors de la tentative de fermeture de l'onglet: ", closeError);
            }
        });
    } else if (autoHide) {
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
        }, 4000);
    }
}

// Fonction utilitaire pour obtenir une valeur de champ
function getInputValue(selector, required = true) {
    const element = document.querySelector(selector);
    if (!element && required) {
        // Check if the selector corresponds to a Choices.js instance and add invalid class
        if (selector === '#nationalitySelect' || selector === '#pays_residenceSelect' || selector === '#countryCode') {
             const choicesWrapper = document.querySelector(`.choices[data-type="select-one"] [name="${selector.substring(1)}"]`)?.closest('.choices');
             choicesWrapper?.classList.add('is-invalid');
         } else if (element) { // Only show toast if element exists but value is empty
        showToast(`Le champ ${selector} est obligatoire.`, "error");
         } else {
            // Element itself not found
             console.warn(`Element with selector ${selector} not found for required check.`);
         }
        return null;
    }
    if (element) {
         // Remove invalid class if value is present
         if (selector === '#nationalitySelect' || selector === '#pays_residenceSelect' || selector === '#countryCode') {
             const choicesWrapper = document.querySelector(`.choices[data-type="select-one"] [name="${selector.substring(1)}"]`)?.closest('.choices');
             choicesWrapper?.classList.remove('is-invalid');
         }
         return element.value.trim();
     } 
     return null;
}

// --- Validation de la longueur du téléphone (Adaptée pour prefix fixe) ---
const DEFAULT_MIN_PHONE_LENGTH = 7;
const DEFAULT_MAX_PHONE_LENGTH = 15;

function validatePhoneNumber() {
    const telInput = document.getElementById('telInput');
    const countrySelect = document.getElementById('countryCode');
    const phoneGroup = document.querySelector('.phone-prefix-input'); // Get the container
    if (!telInput || !countrySelect || !phoneGroup || countrySelect.value === "") return true; // Allow empty or if elements not ready

    const selectedOption = countrySelect.options[countrySelect.selectedIndex];
    const minLength = parseInt(selectedOption?.dataset.minLength, 10) || DEFAULT_MIN_PHONE_LENGTH;
    const maxLength = parseInt(selectedOption?.dataset.maxLength, 10) || DEFAULT_MAX_PHONE_LENGTH;

    // Validate the length of digits in the input field itself (number part only)
    const phoneNumberDigits = telInput.value.replace(/\D/g, ''); 
    const numberLength = phoneNumberDigits.length;

    const isValidLength = numberLength >= minLength && numberLength <= maxLength;
    
    // Apply/remove error class based on validation to the container
    if (numberLength > 0 && !isValidLength) {
        phoneGroup.classList.add('is-invalid'); // Add class to the group
        // Optionally show toast (can be repetitive on input)
        // showToast(`La longueur du numéro pour ${selectedOption.text.split('(')[0].trim()} doit être entre ${minLength} et ${maxLength} chiffres.`, "warning");
    } else {
        phoneGroup.classList.remove('is-invalid'); // Remove class from the group
    }

    return numberLength === 0 || isValidLength; // Valid if empty or within length limits
}

// --- Fin Validation Téléphone ---

// Gestionnaire de la soumission du formulaire
document.getElementById("registrationForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Correction: Mettre à jour les sélecteurs pour les dropdowns
    const selectedFormations = Array.from(
        document.querySelectorAll("#generalFormationsContainer .row-checkbox:checked")
    ).map(el => el.closest(".dropdown-item").querySelector(".item-label")?.textContent.trim() || "");

/*     const selectedConferences = Array.from(
        document.querySelectorAll("#conferenceContainer .row-checkbox:checked")
    ).map(el => {
        const itemLabel = el.closest(".dropdown-item").querySelector(".item-label");
        if (!itemLabel) return null;
        // Reconstruire l'objet conférence à partir des spans
        const theme = itemLabel.querySelector('.field-theme')?.textContent.trim();
        const speaker = itemLabel.querySelector('.field-speaker')?.textContent.trim();
        const date = itemLabel.querySelector('.field-date')?.textContent.trim();
        return { theme, speaker, date }; // Retourner null si un champ manque?
    }).filter(conf => conf && conf.theme); // Filtrer les potentiels nulls ou incomplets
 */
    // Get values directly from select elements
    const selectedNationality = getInputValue("#nationalitySelect");
    const selectedResidence = getInputValue("#pays_residenceSelect");
    const selectedCountryCode = getInputValue("#countryCode");

    // Perform validation before gathering formData?
    const isPhoneValid = validatePhoneNumber(); // Call validation

    const formData = {
        nom: getInputValue("input[name='nom']"),
        prenom: getInputValue("input[name='prenom']"),
        email: getInputValue("input[name='email']"),
        tel: getInputValue("#telInput"), // Just the number part
        sexe: getInputValue("select[name='sexe']"),
        date_naissance: getInputValue("input[name='birthday']"),
        experience_years: getInputValue("select[name='experience_years']"),
        organisation: getInputValue("input[name='organisation']"), // Optional in DB, but required in form
        statut_fonction: getInputValue("input[name='statut']"),
        nationalite: selectedNationality,
        pays_residence: selectedResidence,
        langue_parlee: getInputValue("select[name='langue']"),
        formation_generale: selectedFormations, 
        //conference: selectedConferences, 
        indicatif_pays: selectedCountryCode, // The selected prefix (+33 etc)
    };

    // Validation des champs requis
    let isValid = true; 
    let errorMessages = [];

    // Basic check for required fields using getInputValue logic (which handles toast)
    if (!formData.nom) { isValid = false; errorMessages.push("Nom"); }
    if (!formData.prenom) { isValid = false; errorMessages.push("Prénom"); }
    if (!formData.email) { isValid = false; errorMessages.push("Email"); }
    if (!formData.tel) { isValid = false; errorMessages.push("Téléphone"); document.getElementById('telInput')?.classList.add('is-invalid');}
    else { document.getElementById('telInput')?.classList.remove('is-invalid'); } // Remove error if present
    if (!formData.sexe) { isValid = false; errorMessages.push("Sexe"); document.getElementById('sexe')?.classList.add('is-invalid');}
    else { document.getElementById('sexe')?.classList.remove('is-invalid'); }
    if (!formData.date_naissance) { isValid = false; errorMessages.push("Date de naissance"); document.getElementById('birthday')?.classList.add('is-invalid');}
    else { document.getElementById('birthday')?.classList.remove('is-invalid'); }
    if (!formData.experience_years) { isValid = false; errorMessages.push("Années d'expérience"); document.getElementById('experience_years')?.classList.add('is-invalid');}
    else { document.getElementById('experience_years')?.classList.remove('is-invalid'); }
    if (!formData.organisation) { isValid = false; errorMessages.push("Organisation"); document.getElementById('organisation')?.classList.add('is-invalid');}
    else { document.getElementById('organisation')?.classList.remove('is-invalid'); }
    if (!formData.statut_fonction) { isValid = false; errorMessages.push("Fonction"); document.getElementById('statut')?.classList.add('is-invalid');}
    else { document.getElementById('statut')?.classList.remove('is-invalid'); }
    if (!formData.nationalite) { isValid = false; errorMessages.push("Nationalité"); document.getElementById('nationalitySelect')?.classList.add('is-invalid'); }
    else { document.getElementById('nationalitySelect')?.classList.remove('is-invalid'); }
    if (!formData.pays_residence) { isValid = false; errorMessages.push("Pays de résidence"); document.getElementById('pays_residenceSelect')?.classList.add('is-invalid'); }
    else { document.getElementById('pays_residenceSelect')?.classList.remove('is-invalid'); }
    if (!formData.langue_parlee) { isValid = false; errorMessages.push("Langue"); document.getElementById('langue')?.classList.add('is-invalid');}
    else { document.getElementById('langue')?.classList.remove('is-invalid'); }
    if (!formData.indicatif_pays) { isValid = false; errorMessages.push("Indicatif Pays"); document.getElementById('countryCode')?.classList.add('is-invalid'); }
    else { document.getElementById('countryCode')?.classList.remove('is-invalid'); }

    // Check dropdowns (assuming required)
    if (selectedFormations.length === 0) { 
        isValid = false; 
        errorMessages.push("Formation générale"); 
        document.querySelector('#generalFormationsContainer')?.closest('.dropdown-container').querySelector('.dropdown-title').classList.add('is-invalid');
    } else {
        document.querySelector('#generalFormationsContainer')?.closest('.dropdown-container').querySelector('.dropdown-title').classList.remove('is-invalid');
    }
/*     if (selectedConferences.length === 0) { 
        isValid = false; 
        errorMessages.push("Conférence"); 
        document.querySelector('#conferenceContainer')?.closest('.dropdown-container').querySelector('.dropdown-title').classList.add('is-invalid');
    } else {
        document.querySelector('#conferenceContainer')?.closest('.dropdown-container').querySelector('.dropdown-title').classList.remove('is-invalid');
    } */

    // Check phone validity explicitly
    if (!isPhoneValid) {
        isValid = false;
        // Error message/highlighting is handled within validatePhoneNumber
        // Optionally, ensure toast is shown on submit if invalid
         if (!formData.tel) { // Also check if empty
            showToast("Le champ Téléphone est obligatoire.", "error");
        } else {
            showToast("Le numéro de téléphone n'a pas la longueur requise.", "error");
        }
    }
    
    // Check if the number input itself is empty (getInputValue handles other fields)
    if (!formData.tel) {
        isValid = false;
        document.querySelector('.phone-prefix-input')?.classList.add('is-invalid');
        // Toast message already shown by getInputValue or the phone validation part
    }
    
    if (!isValid) {
        showToast(`Veuillez corriger les champs obligatoires ou invalides.`, "error");
        toggleLoader(false);
        toggleButtonState(false);
        return;
    }

    // Si tout est valide, on peut continuer
    toggleLoader(true);
    toggleButtonState(true);

    console.log("📤 Données envoyées :", formData);

    try {
        const response = await fetch("/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
            // Construire le message de succès avec le lien
            const successMessageHtml = `
                ${escapeHtml(result.message || "Inscription réussie !")} 
                <br>
                <a href="#" id="returnToSiteLink" style="color: white; text-decoration: underline; margin-top: 8px; display: inline-block; font-weight: bold;">Revenir au site principal</a>
            `;
            // Afficher le toast sans disparition automatique
            showToast(successMessageHtml, "success", false);
            document.getElementById("registrationForm").reset();
            // Mettre à jour le préfixe tél au cas où il a été reset
            const countrySelect = document.getElementById('countryCode');
            const phonePrefixSpan = document.getElementById('phonePrefix');
            if(countrySelect && phonePrefixSpan) {
                phonePrefixSpan.textContent = countrySelect.value;
            }
        } else {
            showToast(result.message || "Erreur lors de l'inscription.", "error");
        }
    } catch (error) {
        console.error("🚨 Erreur lors de la soumission :", error);
        showToast("Une erreur réseau est survenue. Veuillez réessayer.", "error"); // Message réseau
    } finally {
        toggleLoader(false);
        toggleButtonState(false);
    }
});

// Function to populate standard select elements
async function populateSelects() {
    const countrySelect = document.getElementById('countryCode');
    const nationalitySelect = document.getElementById('nationalitySelect');
    const residenceSelect = document.getElementById('pays_residenceSelect');
    const phonePrefixSpan = document.getElementById('phonePrefix');

    if (!countrySelect || !nationalitySelect || !residenceSelect || !phonePrefixSpan) {
        console.error("Error: One or more select elements or phone prefix span could not be found.");
        // Disable elements if they exist but others are missing
        if(countrySelect) countrySelect.disabled = true;
        if(nationalitySelect) nationalitySelect.disabled = true;
        if(residenceSelect) residenceSelect.disabled = true;
        if(phonePrefixSpan) phonePrefixSpan.textContent = "ERR";
        return;
    }

    const setPlaceholder = (select, text) => {
        select.innerHTML = `<option value="" disabled selected>${text}</option>`;
    };

    setPlaceholder(countrySelect, 'Chargement...');
    setPlaceholder(nationalitySelect, 'Chargement...');
    setPlaceholder(residenceSelect, 'Chargement...');
    phonePrefixSpan.textContent = "...";

    let countriesData = null;
    let nationalitiesData = null;

    try {
        // 1. Fetch both responses
        const [countriesRes, nationalitiesRes] = await Promise.all([
            fetch('./countrycodes-fr.json'), // No .catch here, let Promise.all handle network errors
            fetch('./nationalities-fr.json')
        ]);

        // 2. Process Countries Response
        if (countriesRes.ok) {
            countriesData = await countriesRes.json(); // Parse JSON *once*
            if (!Array.isArray(countriesData?.countrycode)) {
                throw new Error("Invalid country code data format");
            }
            // Populate Country Select
            setPlaceholder(countrySelect, 'Choisir...');
            const countryOptions = countriesData.countrycode.map(country => ({
                option: new Option(`${country.name} (${country.code})`, country.code),
                minLength: country.minLength || DEFAULT_MIN_PHONE_LENGTH,
                maxLength: country.maxLength || DEFAULT_MAX_PHONE_LENGTH
            }));
            countryOptions.sort((a, b) => a.option.text.localeCompare(b.option.text));
            countryOptions.forEach(item => {
                item.option.dataset.minLength = item.minLength;
                item.option.dataset.maxLength = item.maxLength;
                countrySelect.appendChild(item.option);
            });
        } else {
            throw new Error(`HTTP error ${countriesRes.status} loading country codes`);
        }

        // 3. Process Nationalities Response
        if (nationalitiesRes.ok) {
            nationalitiesData = await nationalitiesRes.json(); // Parse JSON *once*
            if (!Array.isArray(nationalitiesData?.nationalities)) {
                throw new Error("Invalid nationality data format");
            }
            // Populate Nationality Select
            setPlaceholder(nationalitySelect, 'Choisir...');
            const nationalityOptions = nationalitiesData.nationalities
                .map(nat => new Option(nat.label, nat.value)) // text = label, value = country name
                .sort((a, b) => a.text.localeCompare(b.text));
            nationalityOptions.forEach(opt => nationalitySelect.appendChild(opt));
        } else {
            throw new Error(`HTTP error ${nationalitiesRes.status} loading nationalities`);
        }

        // 4. Populate Residence Countries (using parsed countriesData)
        if (countriesData) { // Check if countriesData was successfully parsed
            setPlaceholder(residenceSelect, 'Choisir...');
            const residenceOptions = countriesData.countrycode
                .map(country => new Option(country.name, country.name))
                .sort((a, b) => a.text.localeCompare(b.text));
            residenceOptions.forEach(opt => residenceSelect.appendChild(opt));
        } else {
            // This case means countriesData failed to load/parse earlier
             throw new Error("Cannot populate residence countries, dependency failed.");
        }

        // 5. Set default country code and prefix (needs country select populated)
         const options = Array.from(countrySelect.options);
         const cameroonOptionValue = options.find(opt => opt.text.startsWith("Cameroun"))?.value;
         if (cameroonOptionValue) {
             countrySelect.value = cameroonOptionValue;
             phonePrefixSpan.textContent = cameroonOptionValue;
         } else if (options.length > 1) {
             // Select the first actual country if Cameroon not found
             countrySelect.value = options[1].value; // options[0] is the placeholder
             phonePrefixSpan.textContent = options[1].value;
         } else {
             phonePrefixSpan.textContent = "N/A";
         }

    } catch (error) {
        console.error("Erreur lors du peuplement des listes déroulantes:", error);
        const errorMsg = '<option value="" disabled selected>Erreur</option>';
        if (countrySelect) { setPlaceholder(countrySelect, 'Erreur'); countrySelect.disabled = true; }
        if (nationalitySelect) { setPlaceholder(nationalitySelect, 'Erreur'); nationalitySelect.disabled = true; }
        if (residenceSelect) { setPlaceholder(residenceSelect, 'Erreur'); residenceSelect.disabled = true; }
        if (phonePrefixSpan) { phonePrefixSpan.textContent = "ERR"; }
    }
}

// Initialisation des éléments DOM
document.addEventListener("DOMContentLoaded", () => {
const generalFormations = [
        { category: "Formations continues", title: "Certificat en analyse de données axée sur l'intelligence artificielle" },
        { category: "Formations continues", title: "Formation en gestion de la dette" },
        { category: "Formations continues", title: "Formation en optimisation budgétaire" },
        { category: "Formations continues", title: "Formation en optimisation des recettes non fiscales" },
        { category: "Formations continues", title: "Formation en Gestion budgétaire" },
        { category: "Formations continues", title: "Formation en planification du développement" },
        { category: "Formations continues", title: "Formation en suivi et évaluation des projets, programmes et politiques publiques" },
        { category: "Formations continues", title: "Formation en usage statistiques et prise de décision" },
        { category: "Formations continues", title: "Formation en prévision et durabilité" },
        { category: "Formations diplômantes", title: "Master en Gestion de la Politique Économique" },
        { category: "Formations diplômantes", title: "Master en Data, Economics and Development Policy" },
        { category: "Formation à la carte", title: "Formation à la carte" },
];

const conferences = [
        { theme: "la politique de l'adéquation formation-emploi et ses difficultés", speaker: "Pr. Ebénézer NJOH MOUELLE", date: "26 février" }, 
        { theme: "L'actualité des politiques macroprudentielles", speaker: "Pr. Bruno BEKOLO EBE", date: "26 mars" },
        { theme: "Cadrage macroéconomique et marché du travail", speaker: "Pr. Francis José N'GUESSAN", date: "09 avril" },
        { theme: "Multi-Dimensional Effects of Climate Change on Cameroon's Economy", speaker: "Pr. MOLUA Ernest LYTIA", date: "26 avril" },
        { theme: "Les enjeux de la politique économique dans les pays d'Afrique Centrale et des Grands Lacs", speaker: "Dr Christian EBEKE", date: "28 mai" },
  { theme: "Problématique des réserves de change en Afrique Centrale", speaker: "Pr. Françoise OKAH EFOGO", date: "25 juin" },
        { theme: "Effets de l'insécurité sur la conduite de la politique économique", speaker: "Dr. Thérèse Félicité AZENG", date: "30 juillet" },
  { theme: "État de droit et politique économique", speaker: "Pr. Nadine MACHIKOU", date: "27 août" },
  { theme: "Import-substitution ou industrie industrialisante ou substitution des exportations ?", speaker: "Pr. Dieudonné BONDOMA YOKONO", date: "10 septembre" },
  { theme: "Gestion de la dette", speaker: "M. Edmond Koukoura GNAMIEN", date: "26 novembre" },
        { theme: "L'économie contre la société ?", speaker: "Pr. Armand LEKA ESSOMBA", date: "10 décembre" }
    ];

    // Filtrer les conférences pour n'afficher que celles à venir
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Mettre l'heure à minuit pour comparer uniquement les dates

    const frenchMonths = {
        'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
        'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
    };

    const upcomingConferences = conferences.filter(conf => {
        if (!conf.date) return false; // Ignorer si pas de date
        try {
            const parts = conf.date.toLowerCase().split(' ');
            if (parts.length !== 2) return true; // Garder si format non reconnu

            const day = parseInt(parts[0], 10);
            const monthName = parts[1];
            const month = frenchMonths[monthName];

            if (isNaN(day) || month === undefined) return true; // Garder si parsing échoue

            const currentYear = new Date().getFullYear();
            const conferenceDate = new Date(currentYear, month, day);
            conferenceDate.setHours(0,0,0,0); // Comparer uniquement les dates

            return conferenceDate >= today;
        } catch (error) {
            console.error(`Erreur lors du parsing de la date de conférence: ${conf.date}`, error);
            return true; // Garder en cas d'erreur pour ne pas perdre de données
        }
    });

    // Charger les données
    loadData("generalFormationsContainer", generalFormations, ["title"]);
    // Charger UNIQUEMENT les conférences à venir
    //loadData("conferenceContainer", upcomingConferences, ["theme", "speaker", "date"]);

    // Add event listener for dropdown toggle
    const generalFormationsTitle = document.querySelector('#generalFormationsContainer').previousElementSibling;
    if (generalFormationsTitle) {
        generalFormationsTitle.addEventListener('click', () => toggleDropdown('generalFormationsContainer'));
    }

    const birthdayInput = document.getElementById("birthday");
    if (birthdayInput) {
        birthdayInput.max = new Date().toISOString().split("T")[0];
    }

    // --- Populate Standard Selects --- 
    populateSelects().then(() => {
        const telInput = document.getElementById('telInput');
        const countrySelect = document.getElementById('countryCode');
        const phonePrefixSpan = document.getElementById('phonePrefix');

        if(telInput) {
            // Keydown listener to PREVENT input if max length reached
            telInput.addEventListener('keydown', (event) => {
                const allowedKeys = [
                    'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'
                ];
                // Allow control keys (like Ctrl+A, Ctrl+C, etc.) - This might need refinement based on exact needs
                if (event.ctrlKey || event.metaKey || allowedKeys.includes(event.key)) {
                    return; // Don't block these keys
                }

                const countrySelect = document.getElementById('countryCode');
                if (!countrySelect || countrySelect.value === "") return; // Skip if no country selected

                const selectedOption = countrySelect.options[countrySelect.selectedIndex];
                const maxLength = parseInt(selectedOption?.dataset.maxLength, 10) || DEFAULT_MAX_PHONE_LENGTH;
                
                const currentDigits = telInput.value.replace(/\D/g, '');
                const isDigit = /\d/.test(event.key); // Check if the pressed key is a digit (0-9)

                // Block input if it's a digit AND max length is reached
                if (isDigit && currentDigits.length >= maxLength) {
                    event.preventDefault();
                    return;
                }
                
                // Block input if it's NOT a digit and NOT an allowed key
                if (!isDigit) { 
                    event.preventDefault();
                }
                // If we reach here, the key is a digit and length is not yet max, or an allowed key
            });

            // Input listener primarily for visual validation update after keydown allows changes
            telInput.addEventListener('input', () => {
                validatePhoneNumber(); // Update visual style (is-invalid class)
            });
        }
        if(countrySelect && phonePrefixSpan) {
            countrySelect.addEventListener('change', () => {
                 phonePrefixSpan.textContent = countrySelect.value;
                 // Clear phone input and re-validate when country changes
                 if(telInput) telInput.value = ''; 
                 validatePhoneNumber(); 
            });
            validatePhoneNumber(); // Initial validation
        }
    });

}); // Fin DOMContentLoaded

// Fonction pour charger les données dans les dropdowns (remplace les tableaux)
function loadData(id, data, fields) {
    const container = document.getElementById(id); // Le conteneur (anciennement tbody)
    if (!container) {
        console.error(`Conteneur avec l'ID "${id}" introuvable.`);
        return;
    }
    container.innerHTML = ''; // Vider le conteneur au cas où

    data.forEach((item) => {
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("dropdown-item");

        // Créer la checkbox
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("row-checkbox"); // Garder la classe pour la logique existante
        checkbox.id = `${id}-check-${data.indexOf(item)}`; // ID unique pour le label

        // Créer le label/contenu texte
        const label = document.createElement("label");
        label.htmlFor = checkbox.id; // Lier le label à la checkbox
        label.classList.add("item-label");

        // Construire le contenu du label basé sur les champs
        fields.forEach((field, index) => {
            const span = document.createElement("span");
            span.classList.add(`field-${field.toLowerCase().replace(/\s+/g, '-')}`); // Classe basée sur le nom du champ
            span.textContent = item[field] || ''; // Gérer les champs vides
            label.appendChild(span);
            // Ajouter un séparateur simple si ce n'est pas le dernier champ
            if (index < fields.length - 1) {
                 const separator = document.createElement("span");
                 separator.textContent = " - "; // Ou utiliser un style CSS pour l'espacement
                 separator.style.margin = "0 5px";
                 label.appendChild(separator);
            }
        });

        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(label);

        // Gérer l'interaction sur l'élément div entier
        itemDiv.addEventListener("click", (e) => {
            // Ne pas interférer si on clique directement sur la checkbox ou le label
            if (e.target !== checkbox && e.target !== label && !label.contains(e.target)) {
                checkbox.checked = !checkbox.checked;
            }
            // Déclencher manuellement l'événement change si nécessaire ou juste mettre à jour la classe
            itemDiv.classList.toggle("selected", checkbox.checked);
        });

        // Assurer que l'état initial de la classe correspond à l'état de la checkbox (si jamais pré-coché)
         itemDiv.classList.toggle("selected", checkbox.checked);

        // Ajouter l'élément div au conteneur
        container.appendChild(itemDiv);
    });
}

// Helper function to escape HTML (if not already defined elsewhere)
const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

window.addEventListener("load", () => {
    const loader = document.getElementById("customLoader");
    if (loader) {
        loader.style.display = "none";
    }
});