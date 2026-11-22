document.addEventListener("DOMContentLoaded", function () {
  const empresa = sessionStorage.getItem("empresa");
  const servidorSelect = document.getElementById("servidor-discretizacao");
  const mensagem = document.getElementById("mensagem-discretizacao");
  const corpoTabela = document.querySelector(".tabela-discretizacao tbody");
  const metricas = [
    { tipo: "CPU", nome: "CPU" },
    { tipo: "Memoria", nome: "Memória" },
    { tipo: "Disco", nome: "Disco" }
  ];
  const faixasPadrao = [
    { tipo: "CPU", inicio_alerta: 75, inicio_critico: 90 },
    { tipo: "Memoria", inicio_alerta: 80, inicio_critico: 90 },
    { tipo: "Disco", inicio_alerta: 80, inicio_critico: 90 }
  ];
  let requisicaoAtual = 0;

  function requisicao(url, dados) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    }).then(async function (resposta) {
      if (!resposta.ok) {
        const erro = await resposta.text();
        throw new Error(erro || "Não foi possível carregar as informações.");
      }
      return resposta.json();
    });
  }

  function formatarPercentual(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      maximumFractionDigits: 2
    });
  }

  function criarCelulaFaixa(faixa, descricao) {
    const celula = document.createElement("td");
    const valor = document.createElement("span");
    valor.className = "limite";
    valor.textContent = faixa;
    const detalhe = document.createElement("p");
    detalhe.textContent = descricao;
    celula.append(valor, detalhe);
    return celula;
  }

  function renderizarEstadoInicial(texto) {
    corpoTabela.replaceChildren();
    metricas.forEach(function (metrica) {
      const linha = document.createElement("tr");
      const nome = document.createElement("td");
      const forte = document.createElement("strong");
      forte.textContent = metrica.nome;
      nome.appendChild(forte);
      linha.appendChild(nome);
      const estado = document.createElement("td");
      estado.colSpan = 3;
      estado.textContent = texto;
      linha.appendChild(estado);
      corpoTabela.appendChild(linha);
    });
  }

  function renderizarFaixas(faixas, textoStatus) {
    const metricasPorTipo = {};
    faixas.forEach(function (metrica) {
      metricasPorTipo[metrica.tipo] = metrica;
    });
    corpoTabela.replaceChildren();

    metricas.forEach(function (metrica) {
      const linha = document.createElement("tr");
      const nome = document.createElement("td");
      const forte = document.createElement("strong");
      forte.textContent = metrica.nome;
      nome.appendChild(forte);
      linha.appendChild(nome);

      const atual = metricasPorTipo[metrica.tipo];
      const alerta = atual && atual.inicio_alerta !== null
        ? Number(atual.inicio_alerta)
        : NaN;
      const critico = atual && atual.inicio_critico !== null
        ? Number(atual.inicio_critico)
        : NaN;

      if (!Number.isFinite(alerta) || !Number.isFinite(critico) || alerta >= critico) {
        const estado = atual ? "Faixas não configuradas" : "Métrica não configurada";
        const descricao = atual
          ? "Configure os limites de alerta e crítico para esta métrica."
          : "Este servidor não possui um componente ativo para esta métrica.";
        const celulaEstado = document.createElement("td");
        celulaEstado.colSpan = 3;
        celulaEstado.textContent = estado + ". " + descricao;
        linha.appendChild(celulaEstado);
        corpoTabela.appendChild(linha);
        return;
      }

      linha.append(
        criarCelulaFaixa(
          "Abaixo de " + formatarPercentual(alerta) + "%",
          "Uso dentro da faixa normal."
        ),
        criarCelulaFaixa(
          "De " + formatarPercentual(alerta) + "% até abaixo de "
            + formatarPercentual(critico) + "%",
          "Faixa de alerta para acompanhamento preventivo."
        ),
        criarCelulaFaixa(
          "A partir de " + formatarPercentual(critico) + "%",
          "Faixa crítica conforme os limites atuais."
        )
      );
      corpoTabela.appendChild(linha);
    });

    mensagem.textContent = textoStatus;
  }

  servidorSelect.addEventListener("change", function () {
    const idServidor = servidorSelect.value;
    const chamada = ++requisicaoAtual;
    if (!idServidor) {
      mensagem.textContent = "Selecione um servidor para consultar as faixas.";
      renderizarEstadoInicial("Selecione um servidor para consultar as faixas.");
      return;
    }

    mensagem.textContent = "Carregando as faixas do servidor...";
    renderizarEstadoInicial("Carregando as faixas...");
    requisicao("/ajuda/limites", {
      empresa: empresa,
      id_servidor: Number(idServidor)
    }).then(function (dados) {
      if (chamada !== requisicaoAtual) return;
      renderizarFaixas(
        dados.metricas,
        "Faixas ativas de " + dados.hostname + "."
      );
    }).catch(function (erro) {
      if (chamada !== requisicaoAtual) return;
      console.error("Erro ao consultar as faixas do servidor:", erro);
      mensagem.textContent = erro.message;
      renderizarEstadoInicial("Não foi possível carregar as faixas deste servidor.");
    });
  });

  if (!empresa) {
    servidorSelect.disabled = true;
    mensagem.textContent = "Não foi possível identificar a empresa desta sessão.";
    renderizarEstadoInicial(mensagem.textContent);
    return;
  }

  requisicao("/ajuda/servidores", { empresa: empresa })
    .then(function (servidores) {
      servidorSelect.replaceChildren();
      servidores.forEach(function (servidor) {
        const opcao = document.createElement("option");
        opcao.value = servidor.id;
        opcao.textContent = servidor.hostname;
        servidorSelect.appendChild(opcao);
      });
      servidorSelect.disabled = servidores.length === 0;
      if (servidores.length) {
        servidorSelect.value = String(servidores[0].id);
        servidorSelect.dispatchEvent(new Event("change"));
        return;
      }

      const opcaoVazia = document.createElement("option");
      opcaoVazia.textContent = "Nenhum servidor cadastrado";
      servidorSelect.appendChild(opcaoVazia);
      renderizarFaixas(
        faixasPadrao,
        "Sem servidores cadastrados. Exibindo as faixas padrão do sistema."
      );
    })
    .catch(function (erro) {
      console.error("Erro ao listar servidores da ajuda:", erro);
      servidorSelect.disabled = true;
      mensagem.textContent = erro.message;
      renderizarEstadoInicial("Não foi possível carregar a lista de servidores.");
    });
});
