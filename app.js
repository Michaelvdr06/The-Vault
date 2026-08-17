const STORAGE_KEY = "the-vault-cards-v1";

const seedCards = [
  {
    id: crypto.randomUUID(),
    game: "One Piece TCG",
    name: "Monkey.D.Luffy",
    setName: "OP05",
    cardNumber: "OP05-060",
    rarity: "Super Rare",
    condition: "Near Mint",
    quantity: 1,
    price: 24.95,
    foil: true,
    image: "",
    addedAt: Date.now() - 3000
  },
  {
    id: crypto.randomUUID(),
    game: "Magic: The Gathering",
    name: "Sol Ring",
    setName: "Commander Masters",
    cardNumber: "392",
    rarity: "Uncommon",
    condition: "Near Mint",
    quantity: 2,
    price: 1.75,
    foil: false,
    image: "",
    addedAt: Date.now() - 2000
  },
  {
    id: crypto.randomUUID(),
    game: "One Piece TCG",
    name: "Roronoa Zoro",
    setName: "OP01",
    cardNumber: "OP01-025",
    rarity: "Super Rare",
    condition: "Near Mint",
    quantity: 1,
    price: 8.50,
    foil: true,
    image: "",
    addedAt: Date.now() - 1000
  }
];

let cards = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
if (!cards) {
  cards = seedCards;
  save();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

function navigate(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.getElementById(page).classList.add("active");
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add("active");
  document.getElementById("pageTitle").textContent = {
    dashboard: "Dashboard",
    collection: "Mijn collectie",
    add: "Kaart toevoegen"
  }[page];
  if (page === "collection") renderCollection();
  if (page === "dashboard") renderDashboard();
}

document.querySelectorAll(".nav-item").forEach(btn =>
  btn.addEventListener("click", () => navigate(btn.dataset.page))
);

document.querySelectorAll("[data-goto]").forEach(btn =>
  btn.addEventListener("click", () => navigate(btn.dataset.goto))
);

document.getElementById("quickAdd").addEventListener("click", () => navigate("add"));

function renderDashboard() {
  const totalCards = cards.reduce((sum, c) => sum + Number(c.quantity || 0), 0);
  const op = cards.filter(c => c.game === "One Piece TCG").reduce((s,c)=>s+Number(c.quantity),0);
  const mtg = cards.filter(c => c.game === "Magic: The Gathering").reduce((s,c)=>s+Number(c.quantity),0);
  const value = cards.reduce((sum, c) => sum + Number(c.price || 0) * Number(c.quantity || 0), 0);

  document.getElementById("totalCards").textContent = totalCards;
  document.getElementById("opCount").textContent = op;
  document.getElementById("mtgCount").textContent = mtg;
  document.getElementById("uniqueCards").textContent = cards.length;
  document.getElementById("totalValue").textContent = euro.format(value);

  const opPct = totalCards ? Math.round(op / totalCards * 100) : 0;
  const mtgPct = totalCards ? Math.round(mtg / totalCards * 100) : 0;
  document.getElementById("opPercent").textContent = opPct + "%";
  document.getElementById("mtgPercent").textContent = mtgPct + "%";
  document.getElementById("opBar").style.width = opPct + "%";
  document.getElementById("mtgBar").style.width = mtgPct + "%";

  const recent = [...cards].sort((a,b)=>b.addedAt-a.addedAt).slice(0,4);
  const el = document.getElementById("recentCards");
  if (!recent.length) {
    el.innerHTML = `<p class="muted">Nog geen kaarten toegevoegd.</p>`;
    return;
  }
  el.innerHTML = recent.map(c => `
    <div class="recent-item">
      <div class="recent-thumb">
        ${c.image ? `<img src="${escapeHtml(c.image)}" alt="">` : escapeHtml(initials(c.name))}
      </div>
      <div>
        <h4>${escapeHtml(c.name)}</h4>
        <p>${escapeHtml(c.game)} · ${escapeHtml(c.setName)} · x${c.quantity}</p>
      </div>
      <strong>${euro.format(Number(c.price || 0) * Number(c.quantity || 0))}</strong>
    </div>
  `).join("");
}

function renderCollection() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const game = document.getElementById("gameFilter").value;
  const rarity = document.getElementById("rarityFilter").value;

  const filtered = cards.filter(c => {
    const matchText = [c.name,c.setName,c.cardNumber].join(" ").toLowerCase().includes(q);
    const matchGame = game === "all" || c.game === game;
    const matchRarity = rarity === "all" || c.rarity === rarity;
    return matchText && matchGame && matchRarity;
  });

  document.getElementById("resultCount").textContent = `${filtered.length} unieke kaarten`;

  const grid = document.getElementById("cardGrid");
  const empty = document.getElementById("emptyState");

  if (!filtered.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  grid.innerHTML = filtered.map(c => `
    <article class="collect-card">
      <div class="card-art">
        ${c.image
          ? `<img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.name)}">`
          : `<div class="card-placeholder"><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.setName)} · ${escapeHtml(c.cardNumber || "—")}</small></div>`
        }
        <span class="qty-badge">x${c.quantity}</span>
        ${c.foil ? `<span class="foil-badge">FOIL</span>` : ""}
      </div>
      <div class="card-meta">
        <span class="game-tag">${escapeHtml(c.game === "One Piece TCG" ? "ONE PIECE" : "MAGIC")}</span>
        <h4 title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</h4>
        <p>${escapeHtml(c.setName)} · ${escapeHtml(c.rarity)} · ${escapeHtml(c.condition)}</p>
        <div class="card-bottom">
          <strong>${euro.format(Number(c.price || 0))}</strong>
          <button class="delete-btn" onclick="deleteCard('${c.id}')">Verwijder</button>
        </div>
      </div>
    </article>
  `).join("");
}

window.deleteCard = function(id) {
  cards = cards.filter(c => c.id !== id);
  save();
  renderCollection();
  renderDashboard();
  toast("Kaart verwijderd.");
};

["searchInput","gameFilter","rarityFilter"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderCollection);
});

const fields = ["game","name","setName","cardNumber","image"];
fields.forEach(id => document.getElementById(id).addEventListener("input", updatePreview));

function updatePreview() {
  const name = document.getElementById("name").value || "Nieuwe kaart";
  const game = document.getElementById("game").value;
  const setName = document.getElementById("setName").value || "SET";
  const number = document.getElementById("cardNumber").value || "000";
  const image = document.getElementById("image").value.trim();

  document.getElementById("previewName").textContent = name;
  document.getElementById("previewGame").textContent = game;
  document.getElementById("previewSet").textContent = setName;
  document.getElementById("previewNumber").textContent = number;

  const preview = document.getElementById("previewImage");
  if (image) {
    preview.innerHTML = `<img src="${escapeHtml(image)}" alt="">`;
  } else {
    preview.innerHTML = `<span id="previewInitials">${escapeHtml(initials(name))}</span>`;
  }
}

document.getElementById("cardForm").addEventListener("submit", e => {
  e.preventDefault();
  const card = {
    id: crypto.randomUUID(),
    game: document.getElementById("game").value,
    name: document.getElementById("name").value.trim(),
    setName: document.getElementById("setName").value.trim(),
    cardNumber: document.getElementById("cardNumber").value.trim(),
    rarity: document.getElementById("rarity").value,
    condition: document.getElementById("condition").value,
    quantity: Math.max(1, Number(document.getElementById("quantity").value || 1)),
    price: Math.max(0, Number(document.getElementById("price").value || 0)),
    foil: document.getElementById("foil").checked,
    image: document.getElementById("image").value.trim(),
    addedAt: Date.now()
  };
  cards.unshift(card);
  save();
  e.target.reset();
  document.getElementById("quantity").value = 1;
  document.getElementById("price").value = 0;
  updatePreview();
  renderDashboard();
  toast("Kaart toegevoegd aan The Vault.");
  navigate("collection");
});

function initials(name) {
  return (name || "TCG").split(/[.\s]+/).filter(Boolean).slice(0,3).map(x=>x[0]).join("").toUpperCase();
}

function escapeHtml(value="") {
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"), 1800);
}

renderDashboard();
renderCollection();
updatePreview();
