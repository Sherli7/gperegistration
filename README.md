# README

## Présentation

Ce projet est une application web construite avec **Node.js** et **Express** qui permet aux utilisateurs de s'inscrire à des formations. L'application utilise **PostgreSQL** comme base de données pour stocker les informations des utilisateurs et **Nodemailer** pour envoyer des emails de confirmation après l'inscription.

## Fonctionnalités

- **Formulaire d'inscription** : Permet aux utilisateurs de soumettre leurs informations personnelles.
- **Gestion de la base de données** : Crée une base de données et une table pour stocker les inscriptions si elles n'existent pas.
- **Envoi d'emails** : Envoie un email de confirmation à l'utilisateur et à l'administrateur après une inscription réussie.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé les éléments suivants :

- [Node.js](https://nodejs.org/) (version 12 ou supérieure)
- [PostgreSQL](https://www.postgresql.org/) (version 9.6 ou supérieure)
- Un gestionnaire de paquets comme npm ou yarn

## Installation

1. Clonez le dépôt sur votre machine locale :

   ```bash
   git clone <url_du_dépôt>
   cd nom_du_dépôt
   ```

2. Installez les dépendances nécessaires :

   ```bash
   npm install
   ```

3. Créez un fichier `.env` à la racine du projet et ajoutez-y les variables suivantes :

   ```plaintext
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password

   SERVICE=your_email_service
   HOST=smtp.your_email_service.com
   PORT=587
   USER=your_email@example.com
   PASSWORD=your_email_password
   ```

4. Démarrez le serveur :

   ```bash
   npm start
   ```

5. Accédez à l'application via votre navigateur à l'adresse suivante :

   ```
   http://localhost:3004
   ```

## Routes

### GET /

Affiche le formulaire d'inscription ou un message d'installation si la base de données n'est pas configurée.

### POST /install

- **Description** : Configure la base de données et crée la table d'inscriptions.
- **Corps de la requête** :
  - `database`: Nom de la base de données à créer.

### POST /submit

- **Description** : Soumet les informations d'inscription.
- **Corps de la requête** :
  - `nom`: Nom de l'utilisateur.
  - `prenom`: Prénom de l'utilisateur.
  - `email`: Email de l'utilisateur.
  - `tel`: Numéro de téléphone.
  - `sexe`: Sexe de l'utilisateur.
  - `date_naissance`: Date de naissance.
  - `experience_years`: Années d'expérience.
  - `entreprise`: Nom de l'entreprise.
  - `nationalite`: Nationalité.
  - `pays_residence`: Pays de résidence.
  - `langue_parlee`: Langue parlée.
  - `formation_interessee`: Formation intéressée.
  - `autreformation`: Autres formations.

## Envoi d'emails

L'application utilise Nodemailer pour envoyer des emails. Les modèles d'email sont définis dans le code pour informer les utilisateurs et les administrateurs des nouvelles inscriptions.

## Contribution

Les contributions sont les bienvenues ! Si vous souhaitez contribuer, veuillez suivre ces étapes :

1. Forkez le projet.
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/YourFeature`).
3. Commitez vos modifications (`git commit -m 'Ajout d'une nouvelle fonctionnalité'`).
4. Poussez vers votre branche (`git push origin feature/YourFeature`).
5. Ouvrez une Pull Request.

## License

Ce projet est sous licence MIT. Pour plus de détails, veuillez consulter le fichier LICENSE.

---

Ce README fournit une vue d'ensemble complète du projet, y compris son installation, ses fonctionnalités, ses routes et des instructions sur la contribution. Assurez-vous d'adapter les sections selon vos besoins spécifiques et les détails du projet.

Citations:
[1] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/4983452/af6f74f5-0d9f-44bb-902c-1eec9c8e8131/paste.txt