const API_BASE = "http://localhost:5678/api";

export async function getWorks() {
  const res = await fetch(`${API_BASE}/works`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // [{ id, title, imageUrl, categoryId }, ...]
}

export async function getCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // [{ id, name }, ...]
}