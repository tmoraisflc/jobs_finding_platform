const API_URL = "https://jobicy.com/api/v2/remote-jobs";

const state = {
  jobs: [],
  loading: false,
  error: null,
  searchTerm: "",
  selectedCategory: "",
  selectedType: "",
  visibleCount: 20,
};

const ui = {
  placeholder: null,
  list: null,
  searchInput: null,
  searchButton: null,
  categorySelect: null,
  typeSelect: null,
  loadMoreBtn: null,
};

const format = {
  truncate(text, max = 220) {
    if (!text) return { short: "Descrição não informada.", truncated: false };
    if (text.length <= max) return { short: text, truncated: false };
    return { short: text.slice(0, max).trimEnd() + "...", truncated: true };
  },
  salaryRange(min, max, currency = "USD") {
    const cur = currency.toUpperCase();
    const fmt = (val) =>
      typeof val === "number"
        ? val >= 1000
          ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`
          : `${val}`
        : null;

    const minFmt = fmt(min);
    const maxFmt = fmt(max);

    if (minFmt && maxFmt) return `${cur}$ ${minFmt} - ${maxFmt}`;
    if (minFmt) return `${cur}$ ${minFmt}+`;
    if (maxFmt) return `${cur}$ até ${maxFmt}`;
    return "Faixa não informada";
  },
  dateISOToDisplay(iso) {
    if (!iso) return "-";
    const date = new Date(iso);
    if (Number.isNaN(date)) return iso;
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  },
  dateRelative(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date)) return "";
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "hoje";
    if (diffDays === 1) return "ontem";
    if (diffDays < 7) return `há ${diffDays} dias`;
    const diffWeeks = Math.floor(diffDays / 7);
    return diffWeeks === 1 ? "há 1 semana" : `há ${diffWeeks} semanas`;
  },
};

function initUIRefs() {
  ui.placeholder = $(".placeholder");
  ui.list = $(".jobs-list");
  ui.searchInput = $("input[name='q']");
  ui.searchButton = $(".search-filters .btn");
  ui.categorySelect = $("select[name='category']");
  ui.typeSelect = $("select[name='type']");
  ui.loadMoreBtn = $(".load-more");
}

function showPlaceholder(message, variant = "loading") {
  ui.placeholder
    .removeClass("loading success error hidden")
    .addClass(variant)
    .find("p")
    .text(message);
}

function hidePlaceholder() {
  ui.placeholder.addClass("hidden");
}

function resetListContainer() {
  ui.list.empty();
  ui.list.removeClass("is-populated");
}

function renderSkeletons(count = 4) {
  resetListContainer();
  const fragment = $(document.createDocumentFragment());
  for (let i = 0; i < count; i++) {
    fragment.append(`
      <li class="job-card skeleton">
        <div class="skeleton-line title"></div>
        <div class="skeleton-line meta"></div>
        <div class="skeleton-tags">
          <span class="skeleton-pill"></span>
          <span class="skeleton-pill mid"></span>
          <span class="skeleton-pill long"></span>
        </div>
      </li>
    `);
  }
  ui.list.append(fragment);
}

function renderJobsBasic(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) {
    resetListContainer();
    showPlaceholder("Nenhuma vaga encontrada para os filtros atuais.", "error");
    return;
  }

  resetListContainer();

  const fragment = $(document.createDocumentFragment());

  jobs.forEach((job) => {
    const dateDisplay = format.dateISOToDisplay(job.date);
    const relative = format.dateRelative(job.date);
    const salaryText = format.salaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
    const desc = format.truncate(job.description, 240);
    const jobType = job.jobType || "Tipo n\u00e3o informado";

    const $card = $(`
      <li class="job-card">
        <div class="job-header">
          <p class="job-title">${job.title || "Sem título"}</p>
          <p class="job-company">${job.companyName || "Empresa não informada"}</p>
        </div>
        <div class="job-meta">
          <span class="job-location">${job.location || "Remoto"}</span>
          <span class="job-date" title="${dateDisplay}">${relative || dateDisplay}</span>
          <span class="job-salary">${salaryText}</span>
          <span class="job-type">${jobType}</span>
        </div>
        <p class="job-desc" data-full="${(job.description || "").replace(/"/g, "&quot;")}">
          ${desc.short}
        </p>
        ${
          desc.truncated
            ? '<button type="button" class="btn-inline see-more">Ver mais</button>'
            : ""
        }
      </li>
    `);
    fragment.append($card);
  });

  ui.list.append(fragment);
  ui.list.addClass("is-populated");
  hidePlaceholder();
}

function filterJobsBySearch(jobs, term) {
  if (!term) return jobs;
  const q = term.trim().toLowerCase();
  return jobs.filter((job) => {
    const title = (job.title || "").toLowerCase();
    const company = (job.companyName || "").toLowerCase();
    return title.includes(q) || company.includes(q);
  });
}

function filterJobsByCategory(jobs, category) {
  if (!category) return jobs;
  const target = category.toLowerCase();
  return jobs.filter((job) => {
    const cats = []
      .concat(job.jobIndustry || [])
      .concat(job.jobCategory || [])
      .concat(job.categories || []);

    return cats.some((c) => typeof c === "string" && c.toLowerCase() === target);
  });
}

function filterJobsByType(jobs, type) {
  if (!type) return jobs;
  const target = type.toLowerCase();
  return jobs.filter((job) => {
    const jt = (job.jobType || "").toLowerCase();
    return jt.includes(target);
  });
}

function applyFilters(jobs) {
  let result = filterJobsBySearch(jobs, state.searchTerm);
  result = filterJobsByCategory(result, state.selectedCategory);
  result = filterJobsByType(result, state.selectedType);
  return result;
}

function updateList() {
  const filtered = applyFilters(state.jobs);
  const slice = filtered.slice(0, state.visibleCount);
  renderJobsBasic(slice);

  if (ui.loadMoreBtn) {
    ui.loadMoreBtn.prop("hidden", filtered.length <= state.visibleCount);
    ui.loadMoreBtn.prop("disabled", state.loading);
  }
}

function extractCategories(jobs) {
  const set = new Set();
  jobs.forEach((job) => {
    const candidates = []
      .concat(job.jobIndustry || [])
      .concat(job.jobCategory || [])
      .concat(job.categories || []);

    candidates.forEach((c) => {
      if (typeof c === "string" && c.trim()) {
        set.add(c.trim());
      }
    });
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function populateCategories(jobs) {
  if (!ui.categorySelect?.length) return;
  const options = extractCategories(jobs);
  const frag = $(document.createDocumentFragment());
  frag.append('<option value="">Todas</option>');
  options.forEach((opt) => {
    frag.append(`<option value="${opt}">${opt}</option>`);
  });
  ui.categorySelect.empty().append(frag);
}

function fetchJobs() {
  state.loading = true;
  state.error = null;
  renderSkeletons();
  showPlaceholder("Carregando vagas remotas...", "loading");

  $.getJSON(API_URL)
    .done((data) => {
      state.jobs = data?.jobs || [];
      showPlaceholder(`Dados carregados (${state.jobs.length} vagas). Renderizando...`, "success");
      populateCategories(state.jobs);
      state.visibleCount = 20;
      updateList();
      console.log("Jobs recebidos (preview):", state.jobs.slice(0, 3));
    })
    .fail((jqXHR, textStatus, errorThrown) => {
      state.error = errorThrown || textStatus || "Erro desconhecido";
      showPlaceholder("Erro ao carregar vagas. Tente novamente mais tarde.", "error");
      console.error("Falha ao buscar API Jobicy:", { textStatus, errorThrown, jqXHR });
    })
    .always(() => {
      state.loading = false;
    });
}

$(function () {
  initUIRefs();
  fetchJobs();

  ui.list?.on("click", ".see-more", function () {
    const $btn = $(this);
    const $card = $btn.closest(".job-card");
    const $desc = $card.find(".job-desc");
    const full = $desc.data("full");

    if ($btn.data("expanded")) {
      const truncated = format.truncate(full, 240);
      $desc.text(truncated.short);
      $btn.text("Ver mais").data("expanded", false);
    } else {
      $desc.text(full);
      $btn.text("Ver menos").data("expanded", true);
    }
  });

  ui.searchButton?.on("click", () => {
    const term = ui.searchInput.val();
    state.searchTerm = term;
    state.visibleCount = 20;
    updateList();
  });

  ui.searchInput?.on("input", () => {
    const term = ui.searchInput.val();
    state.searchTerm = term;
    state.visibleCount = 20;
    updateList();
  });

  ui.categorySelect?.on("change", () => {
    state.selectedCategory = ui.categorySelect.val();
    state.visibleCount = 20;
    updateList();
  });

  ui.typeSelect?.on("change", () => {
    state.selectedType = ui.typeSelect.val();
    state.visibleCount = 20;
    updateList();
  });

  ui.loadMoreBtn?.on("click", () => {
    state.visibleCount += 10;
    updateList();
  });
});
