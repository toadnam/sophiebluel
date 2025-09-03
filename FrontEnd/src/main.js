import { getWorks, getCategories } from "./api.js";

const galleryEl = document.getElementById("gallery");
const filtersEl = document.querySelector(".filters");
const adminBar = document.getElementById('admin-bar');
const authLink = document.getElementById('auth-link');
const editBtn = document.getElementById('edit-btn');

const token = localStorage.getItem('token');
const isLogged = !!token;

const modal = document.getElementById('modal');
const modalDialog = document.getElementById('modal-dialog');
const modalClose = document.getElementById('modal-close');
const modalBack = document.getElementById('modal-back');
const modalTitle = document.getElementById('modal-title');
const modalGallery = document.getElementById('modal-gallery');
const modalForm = document.getElementById('modal-form');
const modalToForm = document.getElementById('modal-to-form');
const modalCategory = document.getElementById('modal-category');

const modalFormEl = document.getElementById('modal-add-form');
const uploadPh = document.getElementById('upload-placeholder');
const imageInput = document.getElementById('modal-image');
const previewImg = document.getElementById('upload-preview');
const titleInput = document.getElementById('modal-title-input');
const submitBtn = document.getElementById('modal-submit');

if (authLink) {
    if (isLogged) {
        authLink.textContent = 'logout';
        authLink.href = '#';
        //afficher la barre lorsqu on est logged
        if (adminBar) adminBar.hidden = !isLogged;
        document.body.classList.add('has-admin-bar');
        if (editBtn) editBtn.hidden = !isLogged;
        if (filtersEl) filtersEl.hidden = isLogged;
        authLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            const bar = document.getElementById('admin-bar');
            if (bar) { bar.hidden = true; bar.style.display = 'none'; }
            window.location.reload();
        });
    } else {
        authLink.textContent = 'login';
        document.body.classList.remove('has-admin-bar');
        authLink.href = './login.html';
        if (adminBar) adminBar.hidden = true;
        if (editBtn) editBtn.hidden = true;
        if (filtersEl) filtersEl.hidden = false;
    }
}

let allWorks = [];
let allCategories = [];

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

function renderModalGrid(items) {
    const grid = document.getElementById('modal-grid');
    if (!grid) return;
    grid.innerHTML = items.map(w => `
    <img src="${w.imageUrl}" alt="${escapeHtml(w.title || '')}">
  `).join('');
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
        allCategories = categories;

        renderGallery(works);
        renderModalGrid(works);
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

    let modalCatsLoaded = false; // pour éviter les doublons

    function fillModalCategories() {
        if (!modalCategory || modalCatsLoaded) return;
        modalCategory.innerHTML =
            '<option value="">— Choisir —</option>' +
            allCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
        modalCatsLoaded = true;
    }

    function openModal() {
        if (!modal) return;
        modal.hidden = false;
        // vue galerie par défaut
        if (modalTitle) modalTitle.textContent = 'Galerie photo';
        if (modalBack) modalBack.hidden = true;
        if (modalGallery) modalGallery.hidden = false;
        if (modalForm) modalForm.hidden = true;
    }

    function closeModal() {
        if (modal) modal.hidden = true;
    }

    // bouton "modifier" -> ouvrir
    if (editBtn) editBtn.addEventListener('click', openModal);
    // bouton X -> fermer
    if (modalClose) modalClose.addEventListener('click', closeModal);
    // clic sur l’overlay -> fermer
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // passer à "Ajout photo"
    if (modalToForm) modalToForm.addEventListener('click', () => {
        fillModalCategories();
        modalFormEl?.reset();
        uploadPh?.removeAttribute('hidden');
        previewImg?.setAttribute('hidden', '');
        submitBtn?.setAttribute('disabled', '');

        if (modalTitle) modalTitle.textContent = 'Ajout photo';
        if (modalBack) modalBack.hidden = false;
        if (modalGallery) modalGallery.hidden = true;
        if (modalForm) modalForm.hidden = false;
    });

    // retour à la galerie
    if (modalBack) modalBack.addEventListener('click', () => {
        if (modalTitle) modalTitle.textContent = 'Galerie photo';
        if (modalBack) modalBack.hidden = true;
        if (modalGallery) modalGallery.hidden = false;
        if (modalForm) modalForm.hidden = true;
    });

    function updateSubmitState() {
        const ok = imageInput?.files?.[0] && titleInput?.value.trim() && modalCategory?.value;
        if (ok) submitBtn?.removeAttribute('disabled');
        else submitBtn?.setAttribute('disabled', '');
    }

    imageInput?.addEventListener('change', () => {
        const file = imageInput.files?.[0];

        if (!file) {
            uploadPh?.removeAttribute('hidden');
            previewImg?.setAttribute('hidden', '');
            updateSubmitState();
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Veuillez choisir un fichier image.');
            imageInput.value = '';
            uploadPh?.removeAttribute('hidden');
            previewImg?.setAttribute('hidden', '');
            updateSubmitState();
            return;
        }

        if (file.size > 4 * 1024 * 1024) { // 4 Mo max
            alert('Image trop lourde (4 Mo max).');
            imageInput.value = '';
            uploadPh?.removeAttribute('hidden');
            previewImg?.setAttribute('hidden', '');
            updateSubmitState();
            return;
        }

        previewImg.src = URL.createObjectURL(file);
        previewImg.removeAttribute('hidden');
        uploadPh?.setAttribute('hidden', '');
        updateSubmitState();
    });

    titleInput?.addEventListener('input', updateSubmitState);
    modalCategory?.addEventListener('change', updateSubmitState);

    modalFormEl?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!token) { alert('Vous devez être connecté.'); return; }

        const file = imageInput?.files?.[0];
        const title = titleInput?.value.trim();
        const category = modalCategory?.value;

        if (!file || !title || !category) {
            alert('Complétez image, titre et catégorie.');
            return;
        }

        const fd = new FormData();
        fd.append('image', file);
        fd.append('title', title);
        fd.append('category', category);

        try {
            const res = await fetch('http://localhost:5678/api/works', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: fd
            });

            if (!res.ok) {
                const msg = await res.text().catch(() => '');
                console.error('POST /works', res.status, msg);
                alert("Échec de l'ajout. Vérifiez vos champs.");
                return;
            }

            const newWork = await res.json();

            allWorks.push(newWork);

            const activeBtn = filtersEl?.querySelector('[aria-selected="true"]');
            const currentCat = Number(activeBtn?.dataset?.cat || 0);
            const items = currentCat === 0
                ? allWorks
                : allWorks.filter(w => w.categoryId === currentCat);

            renderGallery(items);
            renderModalGrid(allWorks);

            modalFormEl.reset();
            uploadPh?.removeAttribute('hidden');
            previewImg?.setAttribute('hidden', '');
            submitBtn?.setAttribute('disabled', '');
            modalBack?.click();

            alert('Projet ajouté !');
        } catch (err) {
            console.error(err);
            alert('Erreur réseau pendant l’envoi.');
        }
        
    })();
    