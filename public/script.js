// Fonction pour basculer l'affichage des listes déroulantes
function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
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
    }
}

// Fonction pour afficher un Toast sans dépendance
function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Style du toast
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    toast.style.backgroundColor = type === "success" ? "#28a745" : "#dc3545";
    toast.style.color = "#fff";
    toast.style.padding = "10px 15px";
    toast.style.borderRadius = "5px";
    toast.style.zIndex = "9999";
    toast.style.opacity = "1";
    toast.style.transition = "opacity 0.5s ease";

    // Supprimer le toast après 3 secondes
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Fonction utilitaire pour obtenir une valeur de champ
function getInputValue(selector, required = true) {
    const element = document.querySelector(selector);
    if (!element && required) {
        showToast(`Le champ ${selector} est obligatoire.`, "error");
        return null;
    }
    return element ? element.value.trim() : null;
}

// Gestionnaire de la soumission du formulaire
document.getElementById("registrationForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Activer le loader et désactiver le bouton
    toggleLoader(true);
    toggleButtonState(true);

    const formData = {
        nom: getInputValue("input[name='nom']"),
        prenom: getInputValue("input[name='prenom']"),
        email: getInputValue("input[name='email']"),
        tel: getInputValue("input[name='tel']"),
        sexe: getInputValue("select[name='sexe']"),
        date_naissance: getInputValue("input[name='birthday']"),
        experience_years: getInputValue("select[name='experience_years']"),
        organisation: getInputValue("input[name='organisation']"),
        statut_fonction: getInputValue("input[name='statut']"),
        nationalite: getInputValue("input[name='nationalite']"),
        pays_residence: getInputValue("input[name='pays_residence']"),
        langue_parlee: getInputValue("select[name='langue']"),
        formation_generale: Array.from(
            document.querySelectorAll("#generalFormationsTable .row-checkbox:checked")
        ).map((el) => el.closest("tr").cells[1]?.textContent.trim() || ""),
        conference: (() => {
            const selected = document.querySelector("#conferenceTable .row-checkbox:checked");
            if (selected) {
                const cells = selected.closest("tr").cells;
                return {
                    theme: cells[1]?.textContent.trim(),
                    speaker: cells[2]?.textContent.trim(),
                    date: cells[3]?.textContent.trim(),
                };
            }
            return null;
        })(),
    };

    // Validation des champs obligatoires
    if (!formData.nom || !formData.email || !formData.tel) {
        showToast("Veuillez remplir tous les champs obligatoires.", "error");
        toggleLoader(false);
        toggleButtonState(false);
        return;
    }

    console.log("Données envoyées :", formData);

    try {
        const response = await fetch("/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message || "Inscription réussie !", "success");
            document.getElementById("registrationForm").reset();
        } else {
            showToast(result.message || "Erreur lors de l'inscription.", "error");
        }
    } catch (error) {
        console.error("Erreur lors de la soumission :", error);
        showToast("Une erreur est survenue. Veuillez réessayer.", "error");
    } finally {
        toggleLoader(false);
        toggleButtonState(false); // Réactiver le bouton
    }
});

// Initialisation des éléments DOM
document.addEventListener("DOMContentLoaded", () => {
// Données des formations générales
const generalFormations = [
    // Formations continues
    { category: "Formations continues", title: "Formation en analyse de données axée intelligence artificielle"},
    { category: "Formations continues", title: "Formation en gestion de la dette"},
    { category: "Formations continues", title: "Formation en optimisation budgétaire"},
    { category: "Formations continues", title: "Formation en optimisation des recettes non fiscales"},
    { category: "Formations continues", title: "Formation en Gestion budgétaire"},
    { category: "Formations continues", title: "Formation en planification du développement"},
    { category: "Formations continues", title: "Formation en suivi et évaluation des projets, programmes et politiques publiques"},
    { category: "Formations continues", title: "Formation en usage statistiques et prise de décision"},
    { category: "Formations continues", title: "Formation en prévision et durabilité"},
    // Formations diplômantes
    { category: "Formations diplômantes", title: "Master en Gestion de la Politique Économique"},
    { category: "Formations diplômantes", title: "Master en Data, Economics and Development Policy"},
  // Formation à la carte
  { category: "Formation à la carte", title: "Formation à la carte"},
];

const conferences = [
  /* { theme: "la politique de l'adéquation formation-emploi et ses difficultés", speaker: "Pr. Ebénézer NJOH MOUELLE", date: "26 février" }, */
  /*{ theme: "L’actualité des politiques macroprudentielles", speaker: "Pr. Bruno BEKOLO EBE", date: "26 mars" },*/
  { theme: "Cadrage macroéconomique et marché du travail", speaker: "Pr. Francis José N’GUESSAN", date: "09 avril" },
  { theme: "Multi-Dimensional Effects of Climate Change on Cameroon’s Economy", speaker: "Pr. MOLUA Ernest LYTIA", date: "26 avril" },
  { theme: "Les enjeux de la politique économique dans les pays d’Afrique Centrale et des Grands Lacs", speaker: "Dr Christian EBEKE", date: "28 mai" },
  { theme: "Problématique des réserves de change en Afrique Centrale", speaker: "Pr. Françoise OKAH EFOGO", date: "25 juin" },
  { theme: "Effets de l’insécurité sur la conduite de la politique économique", speaker: "Dr. Thérèse Félicité AZENG", date: "30 juillet" },
  { theme: "État de droit et politique économique", speaker: "Pr. Nadine MACHIKOU", date: "27 août" },
  { theme: "Import-substitution ou industrie industrialisante ou substitution des exportations ?", speaker: "Pr. Dieudonné BONDOMA YOKONO", date: "10 septembre" },
  { theme: "Gestion de la dette", speaker: "M. Edmond Koukoura GNAMIEN", date: "26 novembre" },
  { theme: "L’économie contre la société ?", speaker: "Pr. Armand LEKA ESSOMBA", date: "10 décembre" }
];
    // Charger les données
    loadData("generalFormationsTable", generalFormations, ["title"]);
    loadData("conferenceTable", conferences, ["theme", "speaker", "date"]);

    // Fixer la date maximale pour le champ "Date de naissance"
    const birthdayInput = document.getElementById("birthday");
    if (birthdayInput) {
        birthdayInput.max = new Date().toISOString().split("T")[0];
    }
});

// Fonction pour charger les données dans les tableaux
// Chargement des données dans un tableau
function loadData(id, data, fields) {
    const tableBody = document.getElementById(id);
    if (!tableBody) {
        console.error(`Table avec l'ID "${id}" introuvable.`);
        return;
    }
    data.forEach((item) => {
        const row = document.createElement("tr");

        // Générer le contenu des colonnes
        row.innerHTML = fields.map((field) => `<td>${item[field]}</td>`).join("");

        // Ajouter une case à cocher dans la première colonne
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("row-checkbox");
        const td = document.createElement("td");
        td.appendChild(checkbox);
        row.prepend(td);

        // Gérer l'interaction sur la ligne
        row.addEventListener("click", (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
            }
            row.classList.toggle("selected-row", checkbox.checked);
        });

        // Ajouter la ligne au tableau
        tableBody.appendChild(row);
    });
}
