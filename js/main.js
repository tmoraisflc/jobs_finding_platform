const API_URL = "https://jobicy.com/api/v2/remote-jobs";

const state = {
  jobs: [],
  loading: false,
  error: null,
};

const ui = {
  placeholder: null,
  list: null,
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

function renderJobsBasic(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) {
    showPlaceholder("Nenhuma vaga recebida ainda.", "error");
    return;
  }

  resetListContainer();

  const fragment = $(document.createDocumentFragment());

  jobs.forEach((job) => {
    const dateDisplay = format.dateISOToDisplay(job.date);
    const relative = format.dateRelative(job.date);
    const salaryText = format.salaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
    const desc = format.truncate(job.description, 240);

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

function fetchJobs() {
  state.loading = true;
  state.error = null;
  showPlaceholder("Carregando vagas remotas...", "loading");

  $.getJSON(API_URL)
    .done((data) => {
      state.jobs = data?.jobs || [];
      showPlaceholder(`Dados carregados (${state.jobs.length} vagas). Renderizando...`, "success");
      renderJobsBasic(state.jobs.slice(0, 15)); // carga inicial limitada; ajustes virão depois
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
});
