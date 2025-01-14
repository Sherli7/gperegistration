
// Fonction pour valider l'email
function isMailSyntaxValid(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

// Fonction pour gérer la soumission du formulaire
// Fonction pour gérer la soumission du formulaire
function submitForm(event) {
    event.preventDefault(); // Empêche le rechargement de la page

        // Désactiver le bouton
        submitBtn.classList.add('disabled');
        // Afficher le loader
        const loaderContainer = document.getElementById('loaderContainer');
        loaderContainer.classList.remove('hidden');
    // Récupérer le formulaire et ses données
    const form = document.getElementById('registrationForm');
    const formData = new FormData(form);

    // Construire l'objet de données à envoyer au serveur
    const data = {
        nom: formData.get('nom'),
        prenom: formData.get('prenom'),
        email: formData.get('email'),
        tel: formData.get('tel'),
        sexe: formData.get('sexe'),
        date_naissance: formData.get('birthday'), // Date de naissance
        experience_years: formData.get('experience_years'), // Expérience en années
        entreprise: formData.get('institution'), // Institution
        nationalite: formData.get('nationalite'),
        pays_residence: formData.get('pays_residence'), // Pays de résidence
        langue_parlee: formData.get('langue'), // Langue parlée
        autreformation: formData.get('autreformation'), // Autre formation
        formation_interessee:formData.get('formation_interessee'), //
    };

// Sélectionner le champ téléphone
const telInput = document.getElementById('telInput');

// Fonction pour vérifier si le téléphone ne contient que des nombres
function validateTel(tel) {
    const telRegex = /^\d+$/;
    return telRegex.test(tel);
}

// Écouter les événements de saisie dans le champ téléphone
telInput.addEventListener('input', function() {
    const telValue = telInput.value.trim();
    if (!validateTel(telValue)) {
        // Supprimer les caractères non numériques
        telInput.value = telValue.replace(/\D+/g, '');
    }
});



    // Vérification des champs obligatoires
    let missingFields = [];

    if (!data.nom) missingFields.push('Nom');
    if (!data.email || !isMailSyntaxValid(data.email)) missingFields.push('Email (format invalide)');
    if (!data.tel) missingFields.push('Téléphone');
    if (!data.sexe) missingFields.push('Sexe');
    if (!data.date_naissance) missingFields.push('Date de naissance');
    if (!data.experience_years) missingFields.push("Nombre d'années d'expérience");
    if (!data.entreprise) missingFields.push("Entreprise/Institution actuelle");
    if (!data.nationalite) missingFields.push('Nationalité');
    if (!data.pays_residence) missingFields.push('Pays de résidence');
    if (!data.langue_parlee) missingFields.push('Langue parlée');
    if (!data.formation_interessee) missingFields.push('formation interessée');

    if (missingFields.length > 0) {
        alert(`Veuillez remplir les champs suivants correctement :\n- ${missingFields.join('\n- ')}`);
        return;
    }

    // Masquer le message de confirmation (s'il existe)
    const confirmationMessage = document.getElementById('confirmationMessage');
    confirmationMessage.classList.add('hidden');

    // Envoi des données au serveur
    fetch('/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    .then((response) => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then((result) => {
        if (result.success) {
            Toastify({
                text: 'Inscription réussie !',
                duration: 3000,
                newWindow: true,
                close: true,
                gravity: 'top', // `top` or `bottom`
                position: 'center', // `left`, `center` or `right`
                backgroundColor: "#4CAF50",
                stopOnFocus: true // Prevents dismissing of toast on hover
            }).showToast();
            form.reset();
        } else {
            Toastify({
                text: `Erreur : ${result.message}`,
                duration: 3000,
                newWindow: true,
                close: true,
                gravity: 'top', // `top` or `bottom`
                position: 'center', // `left`, `center` or `right`
                backgroundColor: "#FF9800",
                stopOnFocus: true // Prevents dismissing of toast on hover
            }).showToast();
        }
    })
.catch((error) => {
    Toastify({
        text: 'Erreur lors de l\'inscription.',
        duration: 3000,
        newWindow: true,
        close: true,
        gravity: 'top', // `top` or `bottom`
        position: 'center', // `left`, `center` or `right`
        backgroundColor: "#FF9800",
        stopOnFocus: true // Prevents dismissing of toast on hover
    }).showToast();
})
.finally(() => {
        // Masquer le loader après l'envoi ou en cas d'erreur
        loaderContainer.classList.add('hidden');
});

}



// Gestion de l'événement "submit" du formulaire
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    form.addEventListener('submit', submitForm);
});

// Gestion de l'événement "submit" du formulaire
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    form.addEventListener('submit', submitForm);
});
