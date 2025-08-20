import { getWorks, getCategories } from "./api.js";

const galleryEl = document.getElementById("gallery");

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]
    ));
}

(async () => {
    try {
        console.log("main.js chargé");
        galleryEl.textContent = "Chargement…";

        const works = await getWorks();
        const categories = await getCategories();
        console.log(`GET /categories OK → ${categories.length} catégories`);
        console.table(categories);

        galleryEl.innerHTML = works.map(w => `
      <figure data-id="${w.id}">
        <img src="${w.imageUrl}" alt="${escapeHtml(w.title || "Sans titre")}" loading="lazy">
        <figcaption>${escapeHtml(w.title || "Sans titre")}</figcaption>
      </figure>
    `).join("");

        console.log(`GET /works OK → ${works.length} éléments`);
        console.table(works.map(({ id, title, categoryId }) => ({ id, title, categoryId })));

    } catch (e) {
        console.error("Échec GET /works", e);
        galleryEl.innerHTML = `<p role="alert">Impossible de charger les projets.</p>`;
    }
})();