module.exports = {
    apps: [{
      name: 'gperegistration', // Nom de l'application dans PM2
      script: './server.js', // Chemin vers votre fichier principal (relatif à ecosystem.config.js)
      cwd: '/var/www/html/gperegistration', // Répertoire de travail (pour s'assurer que PM2 exécute depuis le bon dossier)
      autorestart: true, // Redémarre automatiquement en cas de crash
      max_restarts: 0, // 0 = redémarrages illimités
      restart_delay: 1000, // Délai de 1 seconde avant redémarrage
      max_memory_restart: '300M', // Redémarre si la mémoire dépasse 300 Mo
      env: {
        NODE_ENV: 'production', // Mode production
        PORT: 3004 // Port utilisé (vu dans vos logs précédents)
      },
      error_file: '/root/.pm2/logs/gpereg-error.log', // Chemin des logs d'erreur (comme vu dans vos logs)
      out_file: '/root/.pm2/logs/gpereg-out.log', // Chemin des logs de sortie
    }]
  };
  