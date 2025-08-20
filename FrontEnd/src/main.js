import { getWorks, getCategories } from "./api.js";

const galleryEl = document.getElementById("gallery");
const filtersEl = document.querySelector(".filters");

let allWorks = [];

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

        allWorks = works;

        renderGallery(works);
        renderFilters([{ id: 0, name: "Tous" }, ...categories]);

        const firstTab = filtersEl?.querySelector('button[role="tab"]');
        if (firstTab) setActive(firstTab);

        function setActive(btn) {
            document.querySelectorAll('.filters [role="tab"]').forEach(b => {
                const on = b === btn;
                b.classList.toggle('active', on);
                b.setAttribute('aria-selected', on ? 'true' : 'false');
            });
        }

        filtersEl?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[role="tab"]');
            if (!btn) return;
            const id = Number(btn.dataset.cat);
            setActive(btn);
            const items = id === 0 ? allWorks : allWorks.filter(w => w.categoryId === id);
            renderGallery(items);
        });

        console.log(`GET /works OK → ${works.length} éléments`);
        console.log(`GET /categories OK → ${categories.length} catégories`);
        console.table(categories);
    } catch (e) {
        console.error("Erreur lors du chargement", e);
        galleryEl.innerHTML = `<p role="alert">Impossible de charger les projets.</p>`;
    }
})();