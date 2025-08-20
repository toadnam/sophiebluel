import { getWorks } from "./api.js";

console.log("main.js chargé");

(async () => {
  try {
    const works = await getWorks();
    console.log(`GET /works OK → ${works.length} éléments`);
    console.table(works.map(({ id, title, categoryId }) => ({ id, title, categoryId })));
  } catch (e) {
    console.error("Échec GET /works", e);
  }
})();
