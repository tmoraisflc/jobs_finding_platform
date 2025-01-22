const API_URL = "https://jobicy.com/api/v2/remote-jobs";

const state = {
  jobs: [],
  loading: false,
  error: null,
};

function setPlaceholder(message, variant = "loading") {
  const $holder = $(".placeholder");
  $holder
    .removeClass("loading success error")
    .addClass(variant)
    .find("p")
    .text(message);
}

function fetchJobs() {
  state.loading = true;
  state.error = null;
  setPlaceholder("Carregando vagas remotas...", "loading");

  $.getJSON(API_URL)
    .done((data) => {
      state.jobs = data?.jobs || [];
      setPlaceholder(
        `Dados carregados (${state.jobs.length} vagas). Renderização virá na próxima etapa.`,
        "success"
      );
      console.log("Jobs recebidos:", state.jobs.slice(0, 3));
    })
    .fail((jqXHR, textStatus, errorThrown) => {
      state.error = errorThrown || textStatus || "Erro desconhecido";
      setPlaceholder("Erro ao carregar vagas. Tente novamente mais tarde.", "error");
      console.error("Falha ao buscar API Jobicy:", { textStatus, errorThrown, jqXHR });
    })
    .always(() => {
      state.loading = false;
    });
}

$(function () {
  fetchJobs();
});
