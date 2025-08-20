import { getWorks, getCategories } from "./api.js";

const galleryEl = document.getElementById("gallery");
const filtersEl = document.querySelector(".filters");

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]
    ));
}

function renderGallery(items) {
    galleryEl.innerHTML = items.map(w => `
                <figure data-id="${w.id}">
                    <img src="${w.imageUrl}" alt="${escapeHtml(w.title || "Sans titre")}" loading="lazy">
                    <figcaption>${escapeHtml(w.title || "Sans titre")}</figcaption>
                </figure>
            `).join("");
}

function renderFilters(cats) {
    if (!filtersEl) return;
    filtersEl.innerHTML = cats.map((c, i) => `
                <button role="tab" data-cat="${c.id}" aria-selected="${i === 0 ? "true" : "false"}">
                    ${escapeHtml(c.name)}
                </button>
            `).join("");
}

(async () => {
    try {
        console.log("main.js chargé");
        galleryEl.textContent = "Chargement…";

        const [works, categories] = await Promise.all([getWorks(), getCategories()]);

        renderGallery(works);
        renderFilters([{ id: 0, name: "Tous" }, ...categories]);

        console.log(`GET /works OK → ${works.length} éléments`);
        console.log(`GET /categories OK → ${categories.length} catégories`);
        console.table(categories);
    } catch (e) {   
        console.error("Erreur lors du chargement", e);
        galleryEl.innerHTML = `<p role="alert">Impossible de charger les projets.</p>`;
    }
})();