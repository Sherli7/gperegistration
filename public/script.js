// Ajout du style pour les toasts
const style = document.createElement('style');
style.innerHTML = `
.toast-container {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: auto;
    max-width: 400px;
}
.toast {
    background-color: #333;
    color: #fff;
    padding: 15px 20px;
    margin-top: 10px;
    border-radius: 5px;
    opacity: 0.9;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    transition: opacity 0.5s ease-in-out;
    text-align: center;
}
.toast.success { background-color: #28a745; }
.toast.error { background-color: #dc3545; }
.hidden {
    display: none !important;
}`;
document.head.appendChild(style);

// Création du conteneur des toasts
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

// Fonction pour afficher un toast
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Fonction pour afficher/cacher le loader
function toggleLoader(show) {
    const loaderContainer = document.getElementById('loaderContainer');
    if (show) {
        loaderContainer.classList.remove('hidden');
    } else {
        loaderContainer.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const dateInput = document.getElementById('birthday-input');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('max', today);
});

function isMailSyntaxValid(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

function validateTel(tel) {
    const telRegex = /^\d+$/;
    return telRegex.test(tel);
}

const telInput = document.getElementById('telInput');
telInput.addEventListener('input', function() {
    const telValue = telInput.value.trim();
    if (!validateTel(telValue)) {
        telInput.value = telValue.replace(/\D+/g, '');
    }
});

async function submitForm(event) {
    event.preventDefault();
    toggleLoader(true);
    const form = document.getElementById('registrationForm');
    const formData = new FormData(form);
    const data = {
        nom: formData.get('nom'),
        prenom: formData.get('prenom'),
        email: formData.get('email'),
        tel: formData.get('tel'),
        sexe: formData.get('sexe'),
        date_naissance: formData.get('birthday'),
        experience_years: formData.get('experience_years'),
        organisation: formData.get('organisation'),
        nationalite: formData.get('nationalite'),
        pays_residence: formData.get('pays_residence'),
        langue_parlee: formData.get('langue'),
        statut_fonction: formData.get('statut_fonction'),
        rubrique_formation: Array.from(document.querySelectorAll('.item.checked .item-text')).map(el => el.innerText)
    };

    const missingFields = [];
    if (!data.nom) missingFields.push('Nom');
    if (!data.email || !isMailSyntaxValid(data.email)) missingFields.push('Email (format invalide)');
    if (!data.tel || !validateTel(data.tel)) missingFields.push('Téléphone');
    if (!data.sexe) missingFields.push('Sexe');
    if (!data.date_naissance) missingFields.push('Date de naissance');
    if (!data.experience_years) missingFields.push("Nombre d'années d'expérience");
    if (!data.organisation) missingFields.push("Organisation/Institution actuelle");
    if (!data.nationalite) missingFields.push('Nationalité');

    if (missingFields.length > 0) {
        toggleLoader(false);
        showToast(`Veuillez remplir les champs suivants :\n- ${missingFields.join('\n- ')}`, 'error');
        return;
    }

    try {
        const response = await fetch('/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(`Erreur du serveur : ${response.statusText}`);
        showToast('Formulaire soumis avec succès !', 'success');
        form.reset(); // Réinitialiser les champs du formulaire
        document.querySelectorAll('.item.checked').forEach(item => item.classList.remove('checked'));
        document.querySelector('.btn-text').innerText = "Veuillez choisir votre rubrique";
    } catch (error) {
        showToast('Une erreur est survenue. Veuillez réessayer plus tard.', 'error');
    } finally {
        toggleLoader(false);
    }
}

const selectBtn = document.querySelector(".select-btn"),
      items = document.querySelectorAll(".item");
selectBtn.addEventListener("click", () => {
    selectBtn.classList.toggle("open");
});
items.forEach(item => {
    item.addEventListener("click", () => {
        item.classList.toggle("checked");
        let checked = document.querySelectorAll(".checked"),
            btnText = document.querySelector(".btn-text");
            if(checked && checked.length > 0){
                btnText.innerText = `${checked.length} Selected`;
            }else{
                btnText.innerText = "Select Language";
            }
    });
})

document.getElementById('registrationForm').addEventListener('submit', submitForm);
