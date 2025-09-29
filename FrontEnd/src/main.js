import { getWorks, getCategories, deleteWork } from "./api.js";

//Helpers

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]
    ));
}

//Helpers Alerts

const HAS_SWEET = typeof window.Swal !== "undefined";

const Toast = HAS_SWEET ? Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    didOpen: (t) => {
        t.addEventListener("mouseenter", Swal.stopTimer);
        t.addEventListener("mouseleave", Swal.resumeTimer);
    }
}) : null;

function toastSuccess(msg = "Action effectuée") {
    if (HAS_SWEET) return Toast.fire({ icon: "success", title: msg });
    return alert(msg);
}
function toastWarn(msg = "Attention…") {
    if (HAS_SWEET) return Toast.fire({ icon: "warning", title: msg });
    return alert(msg);
}
function alertError(title = "Oups…", text = "Une erreur est survenue.") {
    if (HAS_SWEET) return Swal.fire({ icon: "error", title, text, confirmButtonText: "OK" });
    return alert(`${title}\n${text}`);
}
async function confirmDialog({
    title = "Confirmer",
    text = "Êtes-vous sûr ?",
    confirmText = "Oui",
    cancelText = "Annuler"
} = {}) {
    if (!HAS_SWEET) return confirm(`${title}\n${text}`);
    const { isConfirmed } = await Swal.fire({
        icon: "warning",
        title, text,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        focusCancel: true
    });
    return isConfirmed;
}
async function withBlocking(title = "Veuillez patienter…", fn) {
    if (!HAS_SWEET) return await fn();
    await Swal.fire({
        title,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });
    try {
        const res = await fn();
        return res;
    } finally {
        Swal.close();
    }
}

//Renders (Galerie / Modale / Filtres)

function renderGallery(items) {
    const galleryEl = document.getElementById("gallery");
    if (!galleryEl) return;
    galleryEl.innerHTML = items.map(w => `
                <figure data-id="${w.id}">
                    <img src="${w.imageUrl}" alt="${escapeHtml(w.title || "Sans titre")}" loading="lazy">
                    <figcaption>${escapeHtml(w.title || "Sans titre")}</figcaption>
                </figure>
            `).join("");
}

function renderModalGrid(items) {
    const grid = document.getElementById('modal-grid');
    if (!grid) return;
    grid.innerHTML = items.map(w => `
                <figure class="thumb" data-id="${w.id}">
                    <img src="${w.imageUrl}" alt="${escapeHtml(w.title || '')}">
                    <button type="button" class="thumb-trash" title="Supprimer" aria-label="Supprimer"></button>
                </figure>
            `).join('');
}

function renderFilters(cats) {
    const filtersEl = document.querySelector(".filters");
    if (!filtersEl) return;
    filtersEl.innerHTML = cats.map((c, i) => `
                <button role="tab" data-cat="${c.id}" aria-selected="${i === 0 ? "true" : "false"}">
                    ${escapeHtml(c.name)}
                </button>
            `).join("");
}


//Auth / barre admin

function initAuth() {
    const authLink = document.getElementById('auth-link');
    const adminBar = document.getElementById('admin-bar');
    const editBtn = document.getElementById('edit-btn');
    const filtersEl = document.querySelector(".filters");

    const token = localStorage.getItem('token');
    const isAuthenticated = !!token;

    if (authLink) {
        if (isAuthenticated) {
            authLink.textContent = 'logout';
            authLink.href = '#';
            //afficher la barre lorsqu on est logged
            if (adminBar) adminBar.hidden = !isAuthenticated;
            document.body.classList.add('has-admin-bar');
            if (editBtn) editBtn.hidden = !isAuthenticated;
            if (filtersEl) filtersEl.hidden = isAuthenticated;
            authLink.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                const bar = document.getElementById('admin-bar');
                if (bar) { bar.hidden = true; bar.style.display = 'none'; }
                window.location.reload();
            });
        } else {
            authLink.textContent = 'login';
            authLink.href = './login.html';
            document.body.classList.remove('has-admin-bar');
            if (adminBar) adminBar.hidden = true;
            if (editBtn) editBtn.hidden = true;
            if (filtersEl) filtersEl.hidden = false;
        }
    }

    return { token, isAuthenticated };
}

//Filtres

function initFilters(allWorksRef) {
    const filtersEl = document.querySelector(".filters");
    if (!filtersEl) return;

    function setActive(btn) {
        filtersEl.querySelectorAll("[role='tab']").forEach(b => {
            const on = b === btn;
            b.classList.toggle("active", on);
            b.setAttribute("aria-selected", on ? "true" : "false");
        });
    }

    filtersEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button[role='tab']");
        if (!btn) return;
        const id = Number(btn.dataset.cat);
        setActive(btn);

        const items = id === 0 ? allWorksRef.value : allWorksRef.value.filter(w => w.categoryId === id);
        renderGallery(items);
    });

    const firstTab = filtersEl?.querySelector('button[role="tab"]');
    if (firstTab) setActive(firstTab);
}

//Modale (Open/close/nav + catégories du select)

function initModal(allCategoriesRef) {
    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modal-close');
    const modalBack = document.getElementById('modal-back');
    const modalTitle = document.getElementById('modal-title');
    const modalGallery = document.getElementById('modal-gallery');
    const modalForm = document.getElementById('modal-form');
    const modalToForm = document.getElementById('modal-to-form');
    const editBtn = document.getElementById("edit-btn");
    const modalCategory = document.getElementById('modal-category');


    let catsLoaded = false; // pour éviter les doublons

    function fillModalCategories() {
        if (!modalCategory || catsLoaded) return;
        modalCategory.innerHTML =
            '<option value="" selected disabled></option>' +
            allCategoriesRef.value.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
        catsLoaded = true;
    }

    function show(view) {
        if (view === "form") {
            fillModalCategories();
            if (modalTitle) modalTitle.textContent = "Ajout photo";
            if (modalBack) modalBack.hidden = false;
            if (modalGallery) modalGallery.hidden = true;
            if (modalForm) modalForm.hidden = false;
        } else {
            if (modalTitle) modalTitle.textContent = "Galerie photo";
            if (modalBack) modalBack.hidden = true;
            if (modalGallery) modalGallery.hidden = false;
            if (modalForm) modalForm.hidden = true;
        }
    }

    function open() {
        if (!modal) return;
        modal.hidden = false;
        show("gallery");
    }

    function close() {
        if (modal) modal.hidden = true;
    }

    if (editBtn) editBtn.addEventListener("click", open);
    if (modalClose) modalClose.addEventListener("click", close);
    if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    if (modalToForm) modalToForm.addEventListener("click", () => show("form"));
    if (modalBack) modalBack.addEventListener("click", () => show("gallery"));
}

//suppression
function initDeletion(allWorksRef) {
    const modalGrid = document.getElementById("modal-grid");
    if (!modalGrid) return;

    modalGrid.addEventListener("click", async (e) => {
        const btn = e.target.closest(".thumb-trash");
        if (!btn) return;

        const thumb = btn.closest(".thumb");
        const id = thumb?.dataset.id;
        if (!id) return;

        const okUser = await confirmDialog({
            title: "Supprimer ce projet ?",
            text: "Cette action est irréversible.",
            confirmText: "Supprimer",
            cancelText: "Annuler"
        });
        if (!okUser) return;

        try {
            btn.disabled = true;
            thumb.classList.add("is-deleting");

            await withBlocking("Suppression en cours…", async () => {
                const ok = await deleteWork(id, localStorage.getItem("token"));
                if (!ok) throw new Error("Suppression API échouée");
            });

            //DOM
            thumb.remove();
            document.querySelector(`#gallery [data-id="${id}"]`)?.remove();

            // State
            allWorksRef.value = allWorksRef.value.filter(w => String(w.id) !== String(id));
            toastSuccess("Projet supprimé");
        } catch (err) {
            await alertError("Suppression échouée", "Réessaie dans un instant.");
            btn.disabled = false;
            thumb.classList.remove("is-deleting");
            console.error(err);
        }
    });
}

// Upload / Validation / Submit
function initUpload(tokenRef, allWorksRef) {
    const modalFormEl = document.getElementById('modal-add-form');
    const uploadPh = document.getElementById('upload-placeholder');
    const imageInput = document.getElementById('modal-image');
    const previewImg = document.getElementById('upload-preview');
    const titleInput = document.getElementById('modal-title-input');
    const submitBtn = document.getElementById('modal-submit');
    const modalCategory = document.getElementById("modal-category");
    const modalBack = document.getElementById("modal-back");

    function updateSubmitState() {
        if (imageInput?.files?.[0] && titleInput?.value.trim() && modalCategory?.value) {
            submitBtn?.removeAttribute("disabled");
        } else {
            submitBtn?.setAttribute("disabled", "");
        }
    }
    let previewUrl;

    imageInput?.addEventListener("change", async () => {
        const file = imageInput.files?.[0];

        if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }

        if (!file) {
            uploadPh?.removeAttribute("hidden");
            previewImg?.setAttribute("hidden", "");
            updateSubmitState();
            return;
        }

        if (!file.type.startsWith("image/")) {
            await alertError("Fichier invalide", "Veuillez choisir un fichier image.");
            imageInput.value = "";
            uploadPh?.removeAttribute("hidden");
            previewImg?.setAttribute("hidden", "");
            updateSubmitState();
            return;
        }

        if (file.size > 4 * 1024 * 1024) { // 4 Mo max
            await alertError("Image trop lourde", "La taille maximale est de 4 Mo.");
            imageInput.value = '';
            uploadPh?.removeAttribute('hidden');
            previewImg?.setAttribute('hidden', '');
            updateSubmitState();
            return;
        }

        if (previewImg) {
            previewImg.src = URL.createObjectURL(file);
            previewImg.removeAttribute("hidden");
        }
        uploadPh?.setAttribute("hidden", "");
        updateSubmitState();
    });

    titleInput?.addEventListener('input', updateSubmitState);
    modalCategory?.addEventListener('change', updateSubmitState);

    modalFormEl?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!tokenRef.value) { await alertError("Connexion requise", "Vous devez être connecté pour ajouter un projet."); return; }

        const file = imageInput?.files?.[0];
        const title = titleInput?.value.trim();
        const category = modalCategory?.value;

        if (!file || !title || !category) {
            await alertError("Champs incomplets", "Complétez image, titre et catégorie.");
            return;
        }

        const fd = new FormData();
        fd.append("image", file);
        fd.append("title", title);
        fd.append("category", category);

        try {
            const res = await fetch("http://localhost:5678/api/works", {
                method: "POST",
                headers: { "Authorization": "Bearer " + tokenRef.value },
                body: fd
            });

            if (!res.ok) {
                const msg = await res.text().catch(() => "");
                console.error("POST /works", res.status, msg);
                await alertError("Échec de l'ajout", "Vérifiez vos champs ou réessayez.");
                return;
            }

            const newWork = await res.json();
            allWorksRef.value.push(newWork);

            // Re-render selon filtre actif
            const activeBtn = document.querySelector(".filters [aria-selected='true']");
            const currentCat = Number(activeBtn?.dataset?.cat || 0);
            const items = currentCat === 0
                ? allWorksRef.value
                : allWorksRef.value.filter(w => w.categoryId === currentCat);

            renderGallery(items);
            renderModalGrid(allWorksRef.value);

            // Reset form + revenir à la galerie modale
            modalFormEl.reset();
            uploadPh?.removeAttribute("hidden");
            previewImg?.setAttribute("hidden", "");
            submitBtn?.setAttribute("disabled", "");
            modalBack?.click();

            toastSuccess("Projet ajouté !");
        } catch (err) {
            console.error(err);
            await alertError("Erreur réseau pendant l’envoi.");
        }
    });
}

//Init global

(async function initApp() {
    console.log("main.js rangé par blocs");
    const galleryEl = document.getElementById("gallery");
    if (galleryEl) galleryEl.textContent = "Chargement…";

    //auth / top bar
    const { token } = initAuth();

    //Conteneurs partagés (évite des globales “nues”)
    const tokenRef = { value: token || null };
    const allWorksRef = { value: [] };
    const allCategoriesRef = { value: [] };

    try {
        const [works, categories] = await Promise.all([getWorks(), getCategories()]);
        allWorksRef.value = works;
        allCategoriesRef.value = categories;

        //Renders init
        renderGallery(works);
        renderModalGrid(works);
        renderFilters([{ id: 0, name: "Tous" }, ...categories]);

        // Listeners / modules
        initFilters(allWorksRef);
        initModal(allCategoriesRef);
        initDeletion(allWorksRef);
        initUpload(tokenRef, allWorksRef);

        console.log(`GET /works OK → ${works.length} éléments`);
        console.log(`GET /categories OK → ${categories.length} catégories`);
        console.table(categories);
    } catch (e) {
        console.error("Erreur lors du chargement", e);
        if (galleryEl) galleryEl.innerHTML = `<p role="alert">Impossible de charger les projets.</p>`;
    }
})();