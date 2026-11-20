document.addEventListener("DOMContentLoaded", function () {
  const empresa = sessionStorage.getItem("empresa");
  const tabela = document.getElementById("tabela-servidores-body");
  const busca = document.getElementById("search-input");
  const mensagemLista = document.getElementById("mensagem-lista-servidores");
  const modalCadastro = document.getElementById("modal-servidor");
  const formCadastro = document.getElementById("form-servidor");
  const numeroSerie = document.getElementById("numero-serie");
  const botaoValidarSerie = document.getElementById("btn-validar-serie");
  const camposServidor = document.getElementById("campos-servidor");
  const macAddress = document.getElementById("mac-address");
  const mensagemValidacao = document.getElementById("mensagem-validacao-serie");
  const mensagemCadastro = document.getElementById("mensagem-cadastro-servidor");
  const localidades = document.getElementById("id-local");
  const modalFiltro = document.getElementById("modal-filtro-servidor");
  const modalDetalhes = document.getElementById("modal-detalhes-servidor");
  const modalConfirmacaoExclusao = document.getElementById("modal-confirmar-exclusao-servidor");
  const textoConfirmacaoExclusao = document.getElementById("texto-confirmar-exclusao-servidor");
  const mensagemExclusao = document.getElementById("mensagem-exclusao-servidor");
  const botaoConfirmarExclusao = document.getElementById("btn-confirmar-exclusao-servidor");
  const botaoCancelarExclusao = document.getElementById("btn-cancelar-exclusao-servidor");
  const botaoFecharConfirmacaoExclusao = document.getElementById("btn-fechar-confirmacao-exclusao-servidor");
  let servidoresCache = [];
  let numeroSerieValidado = "";
  let filtrosAtivos = {};
  let servidorParaExcluir = null;
  let exclusaoEmAndamento = false;

  function requisicao(url, dados) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    }).then(async function (resposta) {
      if (!resposta.ok) {
        const erro = await resposta.text();
        throw new Error(erro || "Não foi possível concluir a operação.");
      }
      return resposta.status === 204 ? null : resposta.json();
    });
  }

  function exibirErroLista(erro) {
    mensagemLista.textContent = erro.message;
    mensagemLista.hidden = false;
  }

  function carregarServidores() {
    mensagemLista.hidden = true;
    return requisicao("/servidores/listar", { empresa: empresa })
      .then(function (servidores) {
        servidoresCache = servidores;
        renderizarServidores();
      })
      .catch(function (erro) {
        tabela.innerHTML = "";
        adicionarMensagemTabela(erro.message);
        exibirErroLista(erro);
        throw erro;
      });
  }

  function limparConfirmacaoExclusao() {
    servidorParaExcluir = null;
    exclusaoEmAndamento = false;
    mensagemExclusao.hidden = true;
    mensagemExclusao.textContent = "";
    botaoConfirmarExclusao.disabled = false;
    botaoCancelarExclusao.disabled = false;
    botaoFecharConfirmacaoExclusao.disabled = false;
  }

  function abrirConfirmacaoExclusao(servidor) {
    servidorParaExcluir = servidor;
    textoConfirmacaoExclusao.textContent = "Tem certeza de que deseja excluir o servidor " + servidor.hostname + "?";
    mensagemExclusao.hidden = true;
    mensagemExclusao.textContent = "";
    botaoConfirmarExclusao.disabled = false;
    mostrarModal(modalConfirmacaoExclusao, document.getElementById("btn-cancelar-exclusao-servidor"));
  }

  function fecharConfirmacaoExclusao() {
    if (exclusaoEmAndamento) return;
    const botaoDeletar = modalDetalhes.querySelector(".btn-tertiary");
    limparConfirmacaoExclusao();
    fecharModal(modalConfirmacaoExclusao, botaoDeletar);
  }

  function deletarServidor() {
    if (!servidorParaExcluir || exclusaoEmAndamento) return;

    exclusaoEmAndamento = true;
    botaoConfirmarExclusao.disabled = true;
    botaoCancelarExclusao.disabled = true;
    botaoFecharConfirmacaoExclusao.disabled = true;
    mensagemExclusao.hidden = true;
    requisicao("/servidores/deletar", { id: servidorParaExcluir.id, empresa: empresa })
      .then(function () {
        limparConfirmacaoExclusao();
        fecharModal(modalConfirmacaoExclusao);
        fecharDetalhes();
        busca.focus();
        return carregarServidores().catch(function (erro) {
          console.error("Erro ao atualizar a lista após excluir servidor:", erro);
        });
      })
      .catch(function (erro) {
        exclusaoEmAndamento = false;
        mensagemExclusao.textContent = erro.message;
        mensagemExclusao.hidden = false;
        botaoConfirmarExclusao.disabled = false;
        botaoCancelarExclusao.disabled = false;
        botaoFecharConfirmacaoExclusao.disabled = false;
      });
  }

  function carregarLocalidades() {
    return requisicao("/servidores/localidades", { empresa: empresa })
      .then(function (opcoes) {
        localidades.replaceChildren(new Option("Selecione o local de instalação...", ""));
        opcoes.forEach(function (localidade) {
          localidades.add(new Option(localidade.nome, localidade.id));
        });
        if (opcoes.length === 0) {
          localidades.replaceChildren(new Option("Nenhuma unidade/local cadastrada", ""));
        }
      });
  }

  function adicionarMensagemTabela(texto) {
    const linha = document.createElement("tr");
    const celula = document.createElement("td");
    celula.colSpan = 5;
    celula.textContent = texto;
    linha.appendChild(celula);
    tabela.appendChild(linha);
  }

  function statusLegivel(status) {
    return {
      ONLINE: "Online",
      OFFLINE: "Offline",
      MANUTENCAO: "Manutenção"
    }[status] || status || "Desconhecido";
  }

  function renderizarServidores() {
    const termo = busca.value.trim().toLocaleLowerCase("pt-BR");
    const servidores = servidoresCache.filter(function (servidor) {
      const texto = [
        servidor.hostname,
        servidor.ip,
        servidor.mac_address,
        servidor.responsabilidade,
        servidor.local
      ].join(" ").toLocaleLowerCase("pt-BR");
      return texto.includes(termo)
        && (!filtrosAtivos.responsabilidade || servidor.responsabilidade === filtrosAtivos.responsabilidade)
        && (!filtrosAtivos.status || servidor.stats === filtrosAtivos.status);
    });

    tabela.replaceChildren();
    if (servidores.length === 0) {
      adicionarMensagemTabela(servidoresCache.length ? "Nenhum servidor corresponde aos filtros." : "Nenhum servidor cadastrado.");
      return;
    }

    servidores.forEach(function (servidor) {
      const linha = document.createElement("tr");
      const servidorCell = document.createElement("td");
      const dadosServidor = document.createElement("div");
      dadosServidor.className = "user-details server-name-cell";
      const hostname = document.createElement("span");
      hostname.className = "user-name";
      hostname.textContent = servidor.hostname;
      const ip = document.createElement("span");
      ip.className = "user-email";
      ip.textContent = servidor.ip;
      dadosServidor.append(hostname, ip);
      servidorCell.appendChild(dadosServidor);

      const responsabilidade = document.createElement("td");
      responsabilidade.className = "user-funcao text-dark";
      responsabilidade.textContent = servidor.responsabilidade;
      const local = document.createElement("td");
      local.className = "text-dark";
      local.textContent = servidor.local;

      const status = document.createElement("td");
      status.className = "status-servidor-cell";
      const statusContainer = document.createElement("span");
      const statusText = String(servidor.stats || "").toUpperCase();
      statusContainer.className = "status-container status-servidor " + ({
        ONLINE: "badge-active",
        OFFLINE: "badge-inactive",
        MANUTENCAO: "badge-pending"
      }[statusText] || "badge-pending");
      const dot = document.createElement("span");
      dot.className = "dot";
      const label = document.createElement("span");
      label.className = "status-text";
      label.textContent = statusLegivel(statusText);
      statusContainer.append(dot, label);
      status.appendChild(statusContainer);

      const acoes = document.createElement("td");
      const botaoDetalhes = document.createElement("button");
      botaoDetalhes.className = "action-btn";
      botaoDetalhes.type = "button";
      botaoDetalhes.setAttribute("aria-label", "Visualizar informações de " + servidor.hostname);
      botaoDetalhes.dataset.serverId = servidor.id;
      botaoDetalhes.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>';
      acoes.appendChild(botaoDetalhes);
      linha.append(servidorCell, responsabilidade, local, status, acoes);
      tabela.appendChild(linha);
    });
  }

  function mostrarModal(modal, foco) {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    if (foco) foco.focus();
  }

  function fecharModal(modal, foco) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    if (foco) foco.focus();
  }

  function redefinirValidacaoSerie() {
    numeroSerieValidado = "";
    camposServidor.disabled = true;
    macAddress.value = "";
    mensagemValidacao.hidden = true;
    mensagemValidacao.textContent = "";
    mensagemValidacao.classList.remove("feedback-success");
  }

  function resetarCadastro() {
    formCadastro.reset();
    camposServidor.disabled = true;
    numeroSerieValidado = "";
    macAddress.value = "";
    mensagemValidacao.hidden = true;
    mensagemValidacao.textContent = "";
    mensagemValidacao.classList.remove("feedback-success");
    mensagemCadastro.hidden = true;
    mensagemCadastro.textContent = "";
  }

  document.getElementById("btn-abrir-cadastro").addEventListener("click", function () {
    resetarCadastro();
    mostrarModal(modalCadastro, numeroSerie);
  });
  document.getElementById("btn-fechar-servidor").addEventListener("click", function () {
    fecharModal(modalCadastro, document.getElementById("btn-abrir-cadastro"));
    resetarCadastro();
  });
  document.getElementById("btn-cancelar-servidor").addEventListener("click", function () {
    fecharModal(modalCadastro, document.getElementById("btn-abrir-cadastro"));
    resetarCadastro();
  });

  numeroSerie.addEventListener("input", redefinirValidacaoSerie);

  botaoValidarSerie.addEventListener("click", function () {
    const serieInformada = numeroSerie.value.trim();
    mensagemValidacao.hidden = true;
    mensagemValidacao.textContent = "";
    mensagemValidacao.classList.remove("feedback-success");
    if (!/^[A-Za-z0-9-]{4,64}$/.test(serieInformada)) {
      mensagemValidacao.textContent = "Informe um número de série válido.";
      mensagemValidacao.hidden = false;
      numeroSerie.focus();
      return;
    }

    botaoValidarSerie.disabled = true;
    botaoValidarSerie.textContent = "Validando...";
    requisicao("/servidores/validar-numero-serie", {
      empresa: empresa,
      numero_serie: serieInformada
    }).then(function (equipamento) {
      if (numeroSerie.value.trim() !== serieInformada) return;
      numeroSerieValidado = serieInformada;
      macAddress.value = equipamento.mac_address;
      camposServidor.disabled = false;
      mensagemValidacao.textContent = "Número de série identificado. O cadastro está liberado.";
      mensagemValidacao.classList.add("feedback-success");
      mensagemValidacao.hidden = false;
      document.getElementById("responsabilidade").focus();
    }).catch(function (erro) {
      if (numeroSerie.value.trim() !== serieInformada) return;
      redefinirValidacaoSerie();
      mensagemValidacao.textContent = erro.message;
      mensagemValidacao.hidden = false;
    }).finally(function () {
      botaoValidarSerie.disabled = false;
      botaoValidarSerie.textContent = "Validar";
    });
  });

  formCadastro.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!formCadastro.reportValidity()) return;
    if (!numeroSerieValidado || numeroSerie.value.trim() !== numeroSerieValidado) {
      mensagemCadastro.textContent = "Valide o número de série antes de salvar o servidor.";
      mensagemCadastro.hidden = false;
      return;
    }

    const botaoSalvar = formCadastro.querySelector('button[type="submit"]');
    botaoSalvar.disabled = true;
    mensagemCadastro.hidden = true;
    requisicao("/servidores/cadastrar", {
      ...Object.fromEntries(new FormData(formCadastro)),
      empresa: empresa
    }).then(function () {
      fecharModal(modalCadastro, document.getElementById("btn-abrir-cadastro"));
      resetarCadastro();
      busca.value = "";
      filtrosAtivos = {};
      document.getElementById("form-filtro-servidor").reset();
      return carregarServidores();
    }).catch(function (erro) {
      mensagemCadastro.textContent = erro.message;
      mensagemCadastro.hidden = false;
    }).finally(function () {
      botaoSalvar.disabled = false;
    });
  });

  const botaoAbrirFiltro = document.getElementById("btn-abrir-filtro");
  const formularioFiltro = document.getElementById("form-filtro-servidor");
  function fecharFiltro() {
    fecharModal(modalFiltro, botaoAbrirFiltro);
  }
  botaoAbrirFiltro.addEventListener("click", function () {
    mostrarModal(modalFiltro, document.getElementById("filtro-responsabilidade"));
  });
  document.getElementById("btn-fechar-filtro").addEventListener("click", fecharFiltro);
  document.getElementById("btn-limpar-filtro").addEventListener("click", function () {
    formularioFiltro.reset();
    filtrosAtivos = {};
    renderizarServidores();
  });
  formularioFiltro.addEventListener("submit", function (event) {
    event.preventDefault();
    filtrosAtivos = Object.fromEntries(new FormData(formularioFiltro));
    renderizarServidores();
    fecharFiltro();
  });
  busca.addEventListener("input", renderizarServidores);

  function fecharDetalhes() {
    fecharModal(modalDetalhes);
  }
  document.getElementById("btn-fechar-detalhes").addEventListener("click", fecharDetalhes);
  tabela.addEventListener("click", function (event) {
    const botao = event.target.closest("[data-server-id]");
    if (!botao) return;
    const servidor = servidoresCache.find(function (item) {
      return String(item.id) === botao.dataset.serverId;
    });
    if (!servidor) return;

    const container = document.getElementById("detalhes-servidor");
    container.replaceChildren();
    [
      ["Hostname", servidor.hostname],
      ["Endereço IP", servidor.ip],
      ["Número de Série", servidor.numero_serie],
      ["MAC Address", servidor.mac_address],
      ["Responsabilidade", servidor.responsabilidade],
      ["Unidade / Local", servidor.local],
      ["Sistema Operacional", servidor.sistema_operacional],
      ["Versão do SO", servidor.versao_so],
      ["Status", statusLegivel(String(servidor.stats || "").toUpperCase())]
    ].forEach(function (item) {
      const grupo = document.createElement("div");
      grupo.className = "form-group";
      const rotulo = document.createElement("strong");
      rotulo.textContent = item[0];
      const valor = document.createElement("span");
      valor.textContent = item[1] || "—";
      grupo.append(rotulo, valor);
      container.appendChild(grupo);
    });

    const footer = modalDetalhes.querySelector(".modal-footer");
    const botaoDeletar = document.createElement("button");
    botaoDeletar.className = "btn-tertiary";
    botaoDeletar.type = "button";
    botaoDeletar.textContent = "Deletar";
    botaoDeletar.addEventListener("click", function () {
      abrirConfirmacaoExclusao(servidor);
    });
    footer.replaceChildren(botaoDeletar);

    mostrarModal(modalDetalhes, document.getElementById("btn-fechar-detalhes"));
  });

  botaoFecharConfirmacaoExclusao.addEventListener("click", fecharConfirmacaoExclusao);
  botaoCancelarExclusao.addEventListener("click", fecharConfirmacaoExclusao);
  botaoConfirmarExclusao.addEventListener("click", deletarServidor);

  document.querySelectorAll(".modal-overlay").forEach(function (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target !== modal) return;
      if (modal === modalCadastro) {
        fecharModal(modal, document.getElementById("btn-abrir-cadastro"));
        resetarCadastro();
      } else if (modal === modalFiltro) {
        fecharFiltro();
      } else if (modal === modalDetalhes) {
        fecharDetalhes();
      } else if (modal === modalConfirmacaoExclusao) {
        fecharConfirmacaoExclusao();
      }
    });
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (modalCadastro.classList.contains("active")) {
      fecharModal(modalCadastro, document.getElementById("btn-abrir-cadastro"));
      resetarCadastro();
    } else if (modalFiltro.classList.contains("active")) {
      fecharFiltro();
    } else if (modalConfirmacaoExclusao.classList.contains("active")) {
      fecharConfirmacaoExclusao();
    } else if (modalDetalhes.classList.contains("active")) {
      fecharDetalhes();
    }
  });

  if (!empresa) {
    const erro = new Error("Empresa não encontrada na sessão. Faça login novamente.");
    tabela.replaceChildren();
    adicionarMensagemTabela(erro.message);
    exibirErroLista(erro);
    return;
  }

  carregarServidores().catch(function (erro) {
    console.error("Erro ao carregar servidores:", erro);
  });
  carregarLocalidades().catch(function (erro) {
    console.error("Erro ao carregar localidades:", erro);
    localidades.replaceChildren(new Option("Não foi possível carregar as unidades/locais", ""));
    exibirErroLista(erro);
  });
});

