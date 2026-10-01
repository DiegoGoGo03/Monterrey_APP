/* Prototipo local. En producción, estas funciones se conectarán a una API y PostgreSQL. */
const STORAGE_KEY = "ganaderia-familiar-prototype-v1";

const sampleData = {
  animals: [
    { id: "a1", earTag: "VL-025", name: "Luna", category: "Vaca", sex: "Hembra", purpose: "Leche", birthDate: "2021-03-18", entryDate: "2021-08-10", entryWeight: 300, status: "Activo", notes: "Holstein cruzada" },
    { id: "a2", earTag: "VL-031", name: "Margarita", category: "Vaca", sex: "Hembra", purpose: "Leche", birthDate: "2020-06-05", entryDate: "2020-06-05", entryWeight: 33, status: "Activo", notes: "" },
    { id: "a3", earTag: "EN-102", name: "Canela", category: "Vaca", sex: "Hembra", purpose: "Engorde", birthDate: "2023-01-12", entryDate: "2023-10-05", entryWeight: 275, status: "Activo", notes: "" },
    { id: "a4", earTag: "TR-008", name: "Trueno", category: "Toro", sex: "Macho", purpose: "Reproducción", birthDate: "2019-09-21", entryDate: "2021-02-14", entryWeight: 490, status: "Activo", notes: "" },
    { id: "a5", earTag: "NV-210", name: "Roble", category: "Novillo", sex: "Macho", purpose: "Engorde", birthDate: "2024-02-10", entryDate: "2024-02-10", entryWeight: 34, status: "Activo", notes: "" },
    { id: "a6", earTag: "NV-211", name: "Mora", category: "Novillo", sex: "Hembra", purpose: "Engorde", birthDate: "2023-08-26", entryDate: "2023-08-26", entryWeight: 32, status: "Activo", notes: "" },
    { id: "a7", earTag: "VL-033", name: "Estrella", category: "Vaca", sex: "Hembra", purpose: "Leche", birthDate: "2022-04-08", entryDate: "2022-04-08", entryWeight: 31, status: "Activo", notes: "" },
    { id: "a8", earTag: "EN-095", name: "Cobre", category: "Vaca", sex: "Hembra", purpose: "Engorde", birthDate: "2021-11-03", entryDate: "2022-09-20", entryWeight: 315, status: "Vendido", notes: "Venta en mayo" }
  ],
  weights: [
    { id: "w1", animalId: "a1", date: "2026-09-15", weight: 516, notes: "Control mensual" },
    { id: "w2", animalId: "a2", date: "2026-09-14", weight: 542, notes: "Control mensual" },
    { id: "w3", animalId: "a3", date: "2026-09-12", weight: 448, notes: "" },
    { id: "w4", animalId: "a4", date: "2026-09-11", weight: 718, notes: "" },
    { id: "w5", animalId: "a5", date: "2026-09-14", weight: 314, notes: "" },
    { id: "w6", animalId: "a6", date: "2026-09-14", weight: 286, notes: "" },
    { id: "w7", animalId: "a7", date: "2026-09-15", weight: 471, notes: "" },
    { id: "w8", animalId: "a8", date: "2026-05-03", weight: 476, notes: "Pesaje previo a venta" }
  ],
  expenses: [
    { id: "e1", date: "2026-09-12", type: "Vitaminas", concept: "Complejo vitamínico", amount: 68000, animalId: "a1", supplier: "Agroveterinaria" },
    { id: "e2", date: "2026-09-10", type: "Vacunación", concept: "Vacuna aftosa", amount: 35000, animalId: "a3", supplier: "" },
    { id: "e3", date: "2026-09-08", type: "Alimentación", concept: "Suplemento proteico", amount: 92000, animalId: "a5", supplier: "" }
  ]
};

let data = loadData();
let currentSection = "dashboard";
let animalPendingDeletionId = null;
let toastTimeout;

const $ = (selector) => document.querySelector(selector);
const today = new Date().toISOString().slice(0, 10);

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(sampleData);
  } catch {
    return structuredClone(sampleData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-CO").format(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

function formatDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function ageInYears(birthDate) {
  const now = new Date();
  const birth = new Date(`${birthDate}T12:00:00`);
  let years = now.getFullYear() - birth.getFullYear();
  const monthDifference = now.getMonth() - birth.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < birth.getDate())) years--;
  return Math.max(0, years);
}

function getAnimal(id) {
  return data.animals.find((animal) => animal.id === id);
}

function latestWeight(animalId) {
  const weights = data.weights.filter((weight) => weight.animalId === animalId).sort(compareWeightsNewestFirst);
  return weights[0] || null;
}

function compareWeightsNewestFirst(a, b) {
  const dateOrder = b.date.localeCompare(a.date);
  if (dateOrder) return dateOrder;

  const recordedOrder = String(b.updatedAt || b.recordedAt || "").localeCompare(String(a.updatedAt || a.recordedAt || ""));
  if (recordedOrder) return recordedOrder;

  // Los pesajes antiguos no tienen una hora de registro. Para esos casos,
  // el que se agregó más recientemente al historial gana el desempate.
  return data.weights.indexOf(b) - data.weights.indexOf(a);
}

function syncEntryWeight(animal) {
  const isEntryWeight = (weight) => weight.animalId === animal.id && (weight.isEntryWeight || weight.notes === "Peso de ingreso");
  const existingWeight = data.weights.find(isEntryWeight);

  if (!animal.entryWeight) {
    if (existingWeight) data.weights = data.weights.filter((weight) => !isEntryWeight(weight));
    return;
  }

  const entryWeight = {
    animalId: animal.id,
    date: animal.entryDate,
    weight: animal.entryWeight,
    notes: "Peso de ingreso",
    isEntryWeight: true,
    updatedAt: new Date().toISOString()
  };

  if (existingWeight) {
    Object.assign(existingWeight, entryWeight);
  } else {
    data.weights.push({ id: crypto.randomUUID(), ...entryWeight, recordedAt: entryWeight.updatedAt });
  }
}

function activeFilters() {
  return {
    category: $("#filter-category").value,
    sex: $("#filter-sex").value,
    purpose: $("#filter-purpose").value,
    minAge: Number($("#filter-min-age").value || 0),
    status: $("#filter-status").value
  };
}

function filteredAnimals() {
  const filters = activeFilters();
  return data.animals.filter((animal) =>
    (!filters.category || animal.category === filters.category) &&
    (!filters.sex || animal.sex === filters.sex) &&
    (!filters.purpose || animal.purpose === filters.purpose) &&
    (!filters.minAge || ageInYears(animal.birthDate) >= filters.minAge) &&
    (!filters.status || animal.status === filters.status)
  );
}

function purposeClass(purpose) {
  return purpose.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function renderDashboard() {
  const animals = filteredAnimals();
  const active = animals.filter((animal) => animal.status === "Activo");
  const milk = active.filter((animal) => animal.purpose === "Leche");
  const older = animals.filter((animal) => ageInYears(animal.birthDate) >= 2);
  const weightedAnimals = animals.map((animal) => latestWeight(animal.id)).filter(Boolean);
  const averageWeight = weightedAnimals.length ? weightedAnimals.reduce((sum, item) => sum + Number(item.weight), 0) / weightedAnimals.length : null;

  $("#metric-total").textContent = formatNumber(animals.length);
  $("#metric-total-detail").textContent = animals.length === 1 ? "Animal según filtros" : "Animales según filtros";
  $("#metric-milk").textContent = formatNumber(milk.length);
  $("#metric-milk-detail").textContent = `${active.length} activos en el resultado`;
  $("#metric-older").textContent = formatNumber(older.length);
  $("#metric-older-detail").textContent = older.length === 1 ? "Animal con 2+ años" : "Animales con 2+ años";
  $("#metric-weight").textContent = averageWeight === null ? "—" : `${formatNumber(Math.round(averageWeight))} kg`;
  $("#metric-weight-detail").textContent = weightedAnimals.length ? `${weightedAnimals.length} pesajes disponibles` : "Sin pesajes registrados";

  renderInsight(animals, active);
  renderCategoryChart(animals);
  renderPurposeChart(animals);
  renderAnimalsTable(animals, "#animals-table", true);
  $("#result-count").textContent = `${animals.length} ${animals.length === 1 ? "registro" : "registros"}`;
}

function renderInsight(animals, active) {
  const filters = activeFilters();
  const target = $("#insight-callout");
  const isMilkOlderQuery = filters.category === "Vaca" && filters.purpose === "Leche" && filters.minAge >= 2;
  if (isMilkOlderQuery) {
    target.innerHTML = `<strong>Respuesta a tu consulta:</strong> hay ${active.length} ${active.length === 1 ? "vaca activa" : "vacas activas"} de producción de leche con ${filters.minAge} años o más.`;
    target.classList.add("visible");
  } else if (animals.length === 0) {
    target.textContent = "No hay animales que cumplan estos filtros. Prueba ampliando los criterios.";
    target.classList.add("visible");
  } else {
    target.classList.remove("visible");
  }
}

function renderCategoryChart(animals) {
  const categories = ["Vaca", "Toro", "Novillo"];
  const count = (category) => animals.filter((animal) => animal.category === category).length;
  const maximum = Math.max(1, ...categories.map(count));
  $("#category-chart").innerHTML = categories.map((category) => {
    const value = count(category);
    return `<div class="bar-row"><span>${category}s</span><div class="bar-track"><div class="bar-value" style="width:${(value / maximum) * 100}%"></div></div><strong>${value}</strong></div>`;
  }).join("");
}

function renderPurposeChart(animals) {
  const purposes = [
    { label: "Leche", color: "#173f35" },
    { label: "Engorde", color: "#d4a64c" },
    { label: "Reproducción", color: "#6b9cb0" }
  ];
  const total = animals.length;
  const values = purposes.map((purpose) => ({ ...purpose, value: animals.filter((animal) => animal.purpose === purpose.label).length }));
  const first = total ? (values[0].value / total) * 360 : 0;
  const second = total ? (values[1].value / total) * 360 : 0;
  const donut = $("#purpose-donut");
  donut.style.setProperty("--percent", `${first}deg`);
  donut.style.setProperty("--p2", `${second}deg`);
  $("#donut-total").textContent = total;
  $("#purpose-legend").innerHTML = values.map((item) => `<div><span style="--marker:${item.color}">${item.label}</span><strong>${item.value}</strong></div>`).join("");
}

function renderAnimalsTable(animals, selector, detailed = false) {
  const table = $(selector);
  if (!animals.length) {
    table.innerHTML = `<tr><td class="empty-cell" colspan="8">No hay registros para mostrar.</td></tr>`;
    return;
  }
  table.innerHTML = animals.map((animal) => {
    const weight = latestWeight(animal.id);
    if (detailed) {
      return `<tr>
        <td><div class="animal-reference"><strong>${escapeHtml(animal.name || animal.earTag)}</strong><small>${escapeHtml(animal.earTag)}</small></div></td>
        <td>${animal.category}</td><td>${animal.sex}</td><td><span class="tag ${purposeClass(animal.purpose)}">${animal.purpose}</span></td>
        <td>${ageInYears(animal.birthDate)} ${ageInYears(animal.birthDate) === 1 ? "año" : "años"}</td>
        <td>${weight ? `${formatNumber(weight.weight)} kg` : "Sin dato"}</td>
        <td><span class="status ${animal.status === "Activo" ? "" : "inactive"}">${animal.status}</span></td>
        <td><div class="row-actions"><button class="row-action" type="button" data-add-weight="${animal.id}">+ Peso</button><button class="row-action" type="button" data-edit-animal="${animal.id}">Editar</button><button class="row-action danger" type="button" data-delete-animal="${animal.id}">Eliminar</button></div></td>
      </tr>`;
    }
    return `<tr><td><strong>${escapeHtml(animal.earTag)}</strong></td><td>${escapeHtml(animal.name || "—")}</td><td>${animal.category}</td><td>${animal.sex}</td><td><span class="tag ${purposeClass(animal.purpose)}">${animal.purpose}</span></td><td>${formatDate(animal.birthDate)}</td><td><span class="status ${animal.status === "Activo" ? "" : "inactive"}">${animal.status}</span></td><td><div class="row-actions"><button class="row-action" type="button" data-add-weight="${animal.id}">+ Peso</button><button class="row-action" type="button" data-edit-animal="${animal.id}">Editar</button><button class="row-action danger" type="button" data-delete-animal="${animal.id}">Eliminar</button></div></td></tr>`;
  }).join("");
}

function renderOtherTables() {
  renderAnimalsTable(data.animals, "#all-animals-table");
  const weights = [...data.weights].sort(compareWeightsNewestFirst);
  $("#weights-table").innerHTML = weights.length ? weights.map((weight) => {
    const animal = getAnimal(weight.animalId);
    return `<tr><td>${formatDate(weight.date)}</td><td><strong>${escapeHtml(animal?.earTag || "Animal eliminado")}</strong>${animal?.name ? ` · ${escapeHtml(animal.name)}` : ""}</td><td>${formatNumber(weight.weight)} kg</td><td>${escapeHtml(weight.notes || "—")}</td></tr>`;
  }).join("") : emptyRow(4);
  const expenses = [...data.expenses].sort((a, b) => b.date.localeCompare(a.date));
  $("#expenses-table").innerHTML = expenses.length ? expenses.map((expense) => {
    const animal = getAnimal(expense.animalId);
    return `<tr><td>${formatDate(expense.date)}</td><td><strong>${escapeHtml(expense.concept)}</strong>${expense.supplier ? ` · ${escapeHtml(expense.supplier)}` : ""}</td><td>${expense.type}</td><td>${animal ? escapeHtml(animal.earTag) : "Gasto general"}</td><td><strong>${formatCurrency(expense.amount)}</strong></td></tr>`;
  }).join("") : emptyRow(5);
}

function emptyRow(columns) { return `<tr><td class="empty-cell" colspan="${columns}">No hay registros para mostrar.</td></tr>`; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }

function populateAnimalSelects() {
  const options = `<option value="">Gasto general / sin asignar</option>${data.animals.filter((animal) => animal.status === "Activo").map((animal) => `<option value="${animal.id}">${escapeHtml(animal.earTag)}${animal.name ? ` · ${escapeHtml(animal.name)}` : ""}</option>`).join("")}`;
  $("#expense-animal").innerHTML = options;
  $("#weight-animal").innerHTML = `<option value="">Selecciona un animal</option>${data.animals.filter((animal) => animal.status === "Activo").map((animal) => `<option value="${animal.id}">${escapeHtml(animal.earTag)}${animal.name ? ` · ${escapeHtml(animal.name)}` : ""}</option>`).join("")}`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
}

function showSection(section) {
  currentSection = section;
  document.querySelectorAll(".section").forEach((item) => item.classList.toggle("active-section", item.id === `${section}-section`));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.section === section));
  const labels = { dashboard: ["VISIÓN GENERAL", "Panorama del hato"], animales: ["INVENTARIO", "Animales"], pesajes: ["HISTORIAL", "Pesajes"], gastos: ["CONTROL FINANCIERO", "Gastos asociados"] };
  $("#section-label").textContent = labels[section][0];
  $("#section-title").textContent = labels[section][1];
  $("#new-animal-button").style.display = section === "dashboard" ? "inline-block" : "none";
}

function openModal(modalId, animalId = "") {
  populateAnimalSelects();
  const modal = $(modalId);
  const form = modal.querySelector("form");
  form.reset();
  if (modalId === "#animal-modal") {
    const animal = animalId ? getAnimal(animalId) : null;
    $("#animal-modal-eyebrow").textContent = animal ? "ACTUALIZAR REGISTRO" : "NUEVO REGISTRO";
    $("#animal-modal-title").textContent = animal ? `Editar ${animal.earTag}` : "Registrar animal";
    $("#save-animal-button").textContent = animal ? "Guardar cambios" : "Guardar animal";
    if (animal) {
      form.elements.animalId.value = animal.id;
      form.elements.earTag.value = animal.earTag;
      form.elements.name.value = animal.name;
      form.elements.category.value = animal.category;
      form.elements.sex.value = animal.sex;
      form.elements.purpose.value = animal.purpose;
      form.elements.birthDate.value = animal.birthDate;
      form.elements.entryDate.value = animal.entryDate;
      form.elements.entryWeight.value = animal.entryWeight || "";
      form.elements.notes.value = animal.notes || "";
    } else {
      form.elements.entryDate.value = today;
    }
  } else if (modalId === "#weight-modal") {
    form.elements.date.value = today;
    form.elements.animalId.value = animalId;
  } else if (modalId === "#expense-modal") {
    form.elements.date.value = today;
  }
  modal.showModal();
}

function openDeleteModal(animalId) {
  const animal = getAnimal(animalId);
  if (!animal) return;
  animalPendingDeletionId = animalId;
  const weightCount = data.weights.filter((weight) => weight.animalId === animalId).length;
  const expenseCount = data.expenses.filter((expense) => expense.animalId === animalId).length;
  const name = animal.name ? `${animal.name} (${animal.earTag})` : animal.earTag;
  $("#delete-animal-message").textContent = `Eliminarás a ${name}, junto con ${weightCount} ${weightCount === 1 ? "pesaje" : "pesajes"} y ${expenseCount} ${expenseCount === 1 ? "gasto asociado" : "gastos asociados"}.`;
  $("#delete-animal-modal").showModal();
}

function deleteAnimal(animalId) {
  const animal = getAnimal(animalId);
  if (!animal) return;
  data.animals = data.animals.filter((item) => item.id !== animalId);
  data.weights = data.weights.filter((weight) => weight.animalId !== animalId);
  data.expenses = data.expenses.filter((expense) => expense.animalId !== animalId);
  saveData();
  renderAll();
  showToast(`${animal.earTag} y sus registros asociados fueron eliminados.`);
}

function resetFilters() {
  $("#filters-form").reset();
  $("#filter-status").value = "Activo";
  renderDashboard();
}

function asExcelDate(date) {
  return date ? new Date(`${date}T12:00:00`) : "";
}

function buildExcelSheet(rows, widths, dateColumns = [], numberColumns = []) {
  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  sheet["!cols"] = widths.map((width) => ({ wch: width }));
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range(range) };

  for (let row = 1; row <= range.e.r; row++) {
    dateColumns.forEach((column) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (cell) cell.z = "dd/mm/yyyy";
    });
    numberColumns.forEach(({ column, format }) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (cell) cell.z = format;
    });
  }
  return sheet;
}

function downloadWorkbook() {
  if (!window.XLSX) {
    showToast("No fue posible preparar el archivo de Excel. Recarga la página e inténtalo de nuevo.");
    return;
  }

  const animalRows = [["ID interno", "Arete / ID", "Nombre o referencia", "Categoría", "Sexo", "Propósito", "Fecha de nacimiento", "Fecha de ingreso", "Peso de entrada (kg)", "Último peso (kg)", "Fecha último pesaje", "Estado", "Observaciones"]];
  data.animals.forEach((animal) => {
    const weight = latestWeight(animal.id);
    animalRows.push([
      animal.id, animal.earTag, animal.name || "", animal.category, animal.sex, animal.purpose,
      asExcelDate(animal.birthDate), asExcelDate(animal.entryDate), animal.entryWeight ?? "",
      weight ? Number(weight.weight) : "", asExcelDate(weight?.date), animal.status, animal.notes || ""
    ]);
  });

  const weightRows = [["ID pesaje", "Fecha", "ID animal", "Arete animal", "Nombre animal", "Categoría", "Propósito", "Peso (kg)", "Observación"]];
  [...data.weights].sort(compareWeightsNewestFirst).forEach((weight) => {
    const animal = getAnimal(weight.animalId);
    weightRows.push([
      weight.id, asExcelDate(weight.date), weight.animalId, animal?.earTag || "Animal eliminado", animal?.name || "",
      animal?.category || "", animal?.purpose || "", Number(weight.weight), weight.notes || ""
    ]);
  });

  const expenseRows = [["ID gasto", "Fecha", "Tipo", "Concepto", "Valor (COP)", "Proveedor", "Clasificación", "ID animal", "Arete animal", "Nombre animal", "Categoría animal", "Propósito animal", "Estado animal"]];
  [...data.expenses].sort((a, b) => b.date.localeCompare(a.date)).forEach((expense) => {
    const animal = getAnimal(expense.animalId);
    expenseRows.push([
      expense.id, asExcelDate(expense.date), expense.type, expense.concept, Number(expense.amount), expense.supplier || "",
      animal ? "Gasto asociado al animal" : "Gasto general", animal?.id || "", animal?.earTag || "", animal?.name || "",
      animal?.category || "", animal?.purpose || "", animal?.status || ""
    ]);
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildExcelSheet(animalRows, [38, 16, 22, 14, 12, 16, 18, 16, 20, 18, 20, 14, 32], [6, 7, 10], [{ column: 8, format: "#,##0.0" }, { column: 9, format: "#,##0.0" }]), "Animales");
  XLSX.utils.book_append_sheet(workbook, buildExcelSheet(weightRows, [38, 16, 38, 16, 22, 14, 16, 15, 32], [1], [{ column: 7, format: "#,##0.0" }]), "Pesajes");
  XLSX.utils.book_append_sheet(workbook, buildExcelSheet(expenseRows, [38, 16, 18, 30, 18, 22, 25, 38, 16, 22, 16, 18, 16], [1], [{ column: 4, format: '"$"#,##0' }]), "Gastos");
  XLSX.writeFile(workbook, `ganaderia-familiar-${today}.xlsx`, { compression: true });
  showToast("Archivo de Excel exportado con 3 hojas.");
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => showSection(button.dataset.section)));
  $("#filters-form").addEventListener("input", renderDashboard);
  $("#clear-filters").addEventListener("click", resetFilters);
  $("#new-animal-button").addEventListener("click", () => openModal("#animal-modal"));
  $("#animals-new-button").addEventListener("click", () => openModal("#animal-modal"));
  $("#new-weight-button").addEventListener("click", () => openModal("#weight-modal"));
  $("#new-expense-button").addEventListener("click", () => openModal("#expense-modal"));
  $("#export-button").addEventListener("click", downloadWorkbook);

  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-modal]");
    if (closeButton) {
      const modal = closeButton.closest("dialog");
      if (modal?.id === "delete-animal-modal") animalPendingDeletionId = null;
      modal?.close();
      return;
    }
    const button = event.target.closest("[data-add-weight]");
    if (button) openModal("#weight-modal", button.dataset.addWeight);
    const editButton = event.target.closest("[data-edit-animal]");
    if (editButton) openModal("#animal-modal", editButton.dataset.editAnimal);
    const deleteButton = event.target.closest("[data-delete-animal]");
    if (deleteButton) openDeleteModal(deleteButton.dataset.deleteAnimal);
  });

  $("#animal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.submitter?.value === "cancel") { $("#animal-modal").close(); return; }
    const form = new FormData(event.currentTarget);
    const earTag = form.get("earTag").trim().toUpperCase();
    const animalId = form.get("animalId");
    if (data.animals.some((animal) => animal.id !== animalId && animal.earTag.toUpperCase() === earTag)) { showToast("Ese ID o arete ya está registrado."); return; }
    if (animalId) {
      const animal = getAnimal(animalId);
      if (!animal) { showToast("No se encontró el animal que querías editar."); return; }
      Object.assign(animal, { earTag, name: form.get("name").trim(), category: form.get("category"), sex: form.get("sex"), purpose: form.get("purpose"), birthDate: form.get("birthDate"), entryDate: form.get("entryDate"), entryWeight: Number(form.get("entryWeight")) || null, notes: form.get("notes").trim() });
      syncEntryWeight(animal);
      saveData(); renderAll(); $("#animal-modal").close(); showToast(`${animal.earTag} fue actualizado.`);
      return;
    }
    const animal = { id: crypto.randomUUID(), earTag, name: form.get("name").trim(), category: form.get("category"), sex: form.get("sex"), purpose: form.get("purpose"), birthDate: form.get("birthDate"), entryDate: form.get("entryDate"), entryWeight: Number(form.get("entryWeight")) || null, status: "Activo", notes: form.get("notes").trim() };
    data.animals.push(animal);
    syncEntryWeight(animal);
    saveData(); renderAll(); $("#animal-modal").close(); showToast(`${animal.earTag} fue registrado correctamente.`);
  });

  $("#delete-animal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.submitter?.value === "cancel") { $("#delete-animal-modal").close(); animalPendingDeletionId = null; return; }
    if (!animalPendingDeletionId) { $("#delete-animal-modal").close(); return; }
    deleteAnimal(animalPendingDeletionId);
    animalPendingDeletionId = null;
    $("#delete-animal-modal").close();
  });

  $("#weight-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.submitter?.value === "cancel") { $("#weight-modal").close(); return; }
    const form = new FormData(event.currentTarget);
    data.weights.push({ id: crypto.randomUUID(), animalId: form.get("animalId"), date: form.get("date"), weight: Number(form.get("weight")), notes: form.get("notes").trim(), recordedAt: new Date().toISOString() });
    saveData(); renderAll(); $("#weight-modal").close(); showToast("Pesaje guardado en el historial.");
  });

  $("#expense-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.submitter?.value === "cancel") { $("#expense-modal").close(); return; }
    const form = new FormData(event.currentTarget);
    data.expenses.push({ id: crypto.randomUUID(), date: form.get("date"), type: form.get("type"), concept: form.get("concept").trim(), amount: Number(form.get("amount")), animalId: form.get("animalId"), supplier: form.get("supplier").trim() });
    saveData(); renderAll(); $("#expense-modal").close(); showToast("Gasto registrado correctamente.");
  });
}

function renderAll() { renderDashboard(); renderOtherTables(); populateAnimalSelects(); }

function validateAnimalInput(input) {
  const required = ["earTag", "category", "sex", "purpose", "birthDate", "entryDate"];
  for (const key of required) {
    if (!input[key] || typeof input[key] !== "string") throw new Error(`Falta el campo obligatorio: ${key}.`);
  }
  if (!["Vaca", "Toro", "Novillo"].includes(input.category)) throw new Error("La categoría no es válida.");
  if (!["Hembra", "Macho"].includes(input.sex)) throw new Error("El sexo no es válido.");
  if (!["Leche", "Engorde", "Reproducción"].includes(input.purpose)) throw new Error("El propósito no es válido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)) throw new Error("Las fechas deben usar el formato AAAA-MM-DD.");
}

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const tool = (definition) => Promise.resolve(context.registerTool(definition)).catch(() => {});

  tool({
    name: "consultar_inventario_ganadero",
    title: "Consultar inventario",
    description: "Devuelve los animales que cumplen filtros de categoría, propósito, edad mínima y estado, junto con sus últimos pesos.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["Vaca", "Toro", "Novillo"] },
        purpose: { type: "string", enum: ["Leche", "Engorde", "Reproducción"] },
        minAge: { type: "number", minimum: 0 },
        status: { type: "string", enum: ["Activo", "Vendido", "Fallecido"] }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) {
      const animals = data.animals.filter((animal) =>
        (!input.category || animal.category === input.category) &&
        (!input.purpose || animal.purpose === input.purpose) &&
        (!input.minAge || ageInYears(animal.birthDate) >= input.minAge) &&
        (!input.status || animal.status === input.status)
      ).map((animal) => ({ id: animal.id, arete: animal.earTag, nombre: animal.name || null, categoria: animal.category, proposito: animal.purpose, edadAnios: ageInYears(animal.birthDate), estado: animal.status, ultimoPesoKg: latestWeight(animal.id)?.weight || null }));
      return { total: animals.length, animals };
    }
  });

  tool({
    name: "registrar_animal_ganadero",
    title: "Registrar animal",
    description: "Crea un animal activo y, si se proporciona, agrega su peso de entrada al historial.",
    inputSchema: {
      type: "object",
      properties: {
        earTag: { type: "string", description: "Identificador único del arete." },
        name: { type: "string" },
        category: { type: "string", enum: ["Vaca", "Toro", "Novillo"] },
        sex: { type: "string", enum: ["Hembra", "Macho"] },
        purpose: { type: "string", enum: ["Leche", "Engorde", "Reproducción"] },
        birthDate: { type: "string", description: "Fecha AAAA-MM-DD." },
        entryDate: { type: "string", description: "Fecha AAAA-MM-DD." },
        entryWeight: { type: "number", minimum: 0 },
        notes: { type: "string" }
      },
      required: ["earTag", "category", "sex", "purpose", "birthDate", "entryDate"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      validateAnimalInput(input);
      const earTag = input.earTag.trim().toUpperCase();
      if (data.animals.some((animal) => animal.earTag.toUpperCase() === earTag)) throw new Error("Ya existe un animal con ese ID o arete.");
      const animal = { id: crypto.randomUUID(), earTag, name: input.name?.trim() || "", category: input.category, sex: input.sex, purpose: input.purpose, birthDate: input.birthDate, entryDate: input.entryDate, entryWeight: Number(input.entryWeight) || null, status: "Activo", notes: input.notes?.trim() || "" };
      data.animals.push(animal);
      syncEntryWeight(animal);
      saveData();
      renderAll();
      return { id: animal.id, arete: animal.earTag, status: "registrado" };
    }
  });

  tool({
    name: "registrar_pesaje_ganadero",
    title: "Registrar pesaje",
    description: "Añade un peso al historial de un animal activo identificado por su ID interno.",
    inputSchema: {
      type: "object",
      properties: {
        animalId: { type: "string" },
        date: { type: "string", description: "Fecha AAAA-MM-DD." },
        weight: { type: "number", exclusiveMinimum: 0 },
        notes: { type: "string" }
      },
      required: ["animalId", "date", "weight"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      const animal = getAnimal(input.animalId);
      if (!animal) throw new Error("No se encontró el animal indicado.");
      if (animal.status !== "Activo") throw new Error("Solo se pueden registrar pesos a animales activos.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(input.weight) || input.weight <= 0) throw new Error("Fecha o peso inválido.");
      data.weights.push({ id: crypto.randomUUID(), animalId: animal.id, date: input.date, weight: input.weight, notes: input.notes?.trim() || "", recordedAt: new Date().toISOString() });
      saveData();
      renderAll();
      return { animalId: animal.id, arete: animal.earTag, pesoKg: input.weight, fecha: input.date, status: "registrado" };
    }
  });
}

bindEvents();
resetFilters();
renderOtherTables();
registerWebMcpTools();
