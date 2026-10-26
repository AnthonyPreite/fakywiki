document.addEventListener("DOMContentLoaded", function() {
    // Sélectionner tous les dossiers cliquables
    const toggles = document.querySelectorAll(".folder.toggle");
  
    toggles.forEach(toggle => {
      toggle.addEventListener("click", function() {
        // Trouver le sous-dossier le plus proche (ul.nested)
        const nestedList = this.nextElementSibling;
        if (nestedList) {
          // Basculer la classe 'open' pour afficher/masquer
          nestedList.classList.toggle("open");
        }
      });
    });
  });
  