
/* ==========================================================
   DASHBOARD DO GESTOR
   Visão gerencial e resumida da infraestrutura
   Utiliza a camada compartilhada Monit
   ========================================================== */

(() => {

    const el = (id) => document.getElementById(id);

    const estado = {
        periodo: 60,
        servidores: [],
        resumos: []
    };

    let intervalo = null;
    let carregando = false;

    // ----------------------------------------------------------
    // FORMATAÇÃO
    // ----------------------------------------------------------

    const fmt = (v) => Monit.fmt(v);

    function classeStatus(status) {
        const classes = {
            normal: "normal",
            alerta: "alerta",
            critico: "critico",
            semdados: "semdados"
        };

        return classes[status] || "semdados";
    }

    function textoStatus(status) {
        const textos = {
            normal: "Normal",
            alerta: "Em alerta",
            critico: "Crítico",
            semdados: "Sem comunicação"
        };

        return textos[status] || "Indefinido";
    }

    // ----------------------------------------------------------
    // RESUMO GERAL
    // ----------------------------------------------------------

    function atualizarIndicadores() {

        const total = estado.resumos.length;

        const contagem = {
            normal: 0,
            alerta: 0,
            critico: 0,
            semdados: 0
        };

        estado.resumos.forEach((item) => {
            contagem[item.status]++;
        });

        el("totalServidores").textContent = total;
        el("totalNormais").textContent = contagem.normal;
        el("totalAlertas").textContent = contagem.alerta;
        el("totalCriticos").textContent = contagem.critico;

        el("contadorServidores").textContent =
            total + (total === 1 ? " servidor" : " servidores");
    }

    // ----------------------------------------------------------
    // BARRA DE UTILIZAÇÃO
    // ----------------------------------------------------------

    function barraUtilizacao(valor) {

        const v = Math.min(100, Math.max(0, valor));

        let cor = "#16a36a";

        if (valor >= 90) {
            cor = "#dc2626";
        } else if (valor >= 79) {
            cor = "#d97706";
        }

        return `
      <div class="gestor-utilizacao">

        <div class="gestor-progress">
          <span style="width:${v}%; background:${cor}"></span>
        </div>

        <small>${fmt(valor)}%</small>

      </div>
    `;
    }

    // ----------------------------------------------------------
    // TABELA DE SERVIDORES
    // ----------------------------------------------------------

    function renderServidores() {

        const corpo = el("tabelaServidores");

        if (!estado.resumos.length) {
            corpo.innerHTML = `
        <tr>
          <td colspan="6">Nenhum servidor encontrado.</td>
        </tr>
      `;
            return;
        }

        corpo.innerHTML = estado.resumos.map((item) => {

            const srv = item.servidor;
            const r = item.resumo;

            return `
        <tr>

          <td>
            <div class="gestor-server-name">
              <strong>${srv.id}</strong>
              <small>${srv.hostname}</small>
            </div>
          </td>

          <td>
            ${barraUtilizacao(r.CPU.pct)}
          </td>

          <td>
            ${barraUtilizacao(r.RAM.pct)}
          </td>

          <td>
            ${barraUtilizacao(r.Disco.pct)}
          </td>

          <td>
            <span class="gestor-rede">
              ${fmt(r.Rede.valor)} Mbps
            </span>
          </td>

          <td>
            <span class="gestor-status ${classeStatus(item.status)}">
              <i></i>
              ${textoStatus(item.status)}
            </span>
          </td>

        </tr>
      `;

        }).join("");

    }

    // ----------------------------------------------------------
    // PRIORIDADES
    // ----------------------------------------------------------

    function gerarPrioridades() {

        const prioridades = [];

        estado.resumos.forEach((item) => {

            const srv = item.servidor;
            const r = item.resumo;

            if (item.status === "semdados") {

                prioridades.push({
                    servidor: srv.id,
                    componente: "Comunicação",
                    valor: "Sem comunicação",
                    nivel: "critico",
                    mensagem: "Servidor sem comunicação com o monitoramento."
                });

                return;
            }

            ["CPU", "RAM", "Disco"].forEach((comp) => {

                const dados = r[comp];
                const limite = Monit.LIMITES[comp];

                if (!limite) return;

                if (dados.pct >= limite.alerta) {

                    const critico = dados.pct >= limite.critico;

                    prioridades.push({
                        servidor: srv.id,
                        componente: comp,
                        valor: fmt(dados.pct) + "%",
                        nivel: critico ? "critico" : "alerta",
                        mensagem: critico
                            ? "Utilização acima do limite crítico."
                            : "Utilização acima do limite de alerta."
                    });

                }

            });

        });

        // Críticos primeiro e depois alertas
        prioridades.sort((a, b) => {
            const peso = { critico: 0, alerta: 1 };
            return peso[a.nivel] - peso[b.nivel];
        });

        return prioridades;

    }

    function renderPrioridades() {

        const lista = el("listaPrioridades");
        const prioridades = gerarPrioridades();

        el("contadorPrioridades").textContent =
            prioridades.length +
            (prioridades.length === 1 ? " ocorrência" : " ocorrências");

        if (!prioridades.length) {

            lista.innerHTML = `
        <div class="gestor-vazio">
          <span class="gestor-vazio-icon">✓</span>
          <strong>Nenhuma prioridade identificada</strong>
          <p>Todos os servidores estão dentro dos limites monitorados.</p>
        </div>
      `;

            return;
        }

        lista.innerHTML = prioridades.map((p) => {

            return `
        <article class="gestor-prioridade ${p.nivel}">

          <div class="gestor-prioridade-icon">
            ${p.nivel === "critico" ? "!" : "!"}
          </div>

          <div class="gestor-prioridade-info">

            <strong>${p.servidor} · ${p.componente}</strong>

            <p>${p.mensagem}</p>

          </div>

          <div class="gestor-prioridade-valor">

            <strong>${p.valor}</strong>

            <span>
              ${p.nivel === "critico" ? "Crítico" : "Atenção"}
            </span>

          </div>

        </article>
      `;

        }).join("");

    }

    // ----------------------------------------------------------
    // RENDERIZAÇÃO
    // ----------------------------------------------------------

    function renderizar() {

        atualizarIndicadores();

        renderServidores();

        renderPrioridades();

        const agora = new Date();

        el("ultimaAtualizacao").textContent =
            "Atualizado às " +
            agora.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });

        el("statusAtualizacao").textContent =
            "Atualização automática ativa";

    }


    //SERVIDOR ACESSO

   
document.addEventListener("DOMContentLoaded", () => {

    // Dados mockados dos servidores
    const servidores = [
        {
            id: "srv01",
            nome: "Servidor 01 - Serv-10099",
            ip: "192.168.1.10"
        },
        {
            id: "srv02",
            nome: "Servidor 02 - Serv-10100",
            ip: "192.168.1.20"
        },
        {
            id: "srv03",
            nome: "Servidor 03 - Serv-10101",
            ip: "192.168.1.30"
        },
        {
            id: "srv04",
            nome: "Servidor 04 - Serv-10102",
            ip: "192.168.1.40"
        }
    ];

    const selectServidor =
        document.getElementById("selectServidor");

    const btnAcessar =
        document.getElementById("btnAcessarAnalista");

    if (!selectServidor || !btnAcessar) {
        console.error("Elementos de seleção não encontrados.");
        return;
    }

    // Preenche o select com os servidores
    selectServidor.innerHTML =
        '<option value="">Selecione um servidor</option>';

    servidores.forEach(servidor => {
        const option = document.createElement("option");

        option.value = servidor.id;
        option.textContent = servidor.nome;

        selectServidor.appendChild(option);
    });

    // Habilita o botão após selecionar
    selectServidor.addEventListener("change", () => {
        btnAcessar.disabled = !selectServidor.value;
    });

    // Navega para a tela de Analista
    btnAcessar.addEventListener("click", () => {

        const servidorSelecionado = servidores.find(
            servidor => servidor.id === selectServidor.value
        );

        if (!servidorSelecionado) {
            alert("Selecione um servidor.");
            return;
        }

        // Passa os dados do servidor pela URL
        const parametros = new URLSearchParams({
            servidor: servidorSelecionado.id,
            nome: servidorSelecionado.nome,
            ip: servidorSelecionado.ip
        });

        window.location.href =
            `analista.html?${parametros.toString()}`;

    });



        // Preenche o Select Option
        servidores.forEach(servidor => {

            const option = document.createElement("option");

            option.value = servidor.id;
            option.textContent = servidor.nome;

            selectServidor.appendChild(option);
        });

        // Habilita o botão após selecionar
        selectServidor.addEventListener("change", () => {

            btnAcessar.disabled = !selectServidor.value;

        });

        // Navega para o Analista
        btnAcessar.addEventListener("click", () => {

            const servidorSelecionado = selectServidor.value;

            if (!servidorSelecionado) {
                alert("Selecione um servidor.");
                return;
            }

            const servidor = servidores.find(
                item => item.id === servidorSelecionado
            );

            if (!servidor) {
                alert("Servidor não encontrado.");
                return;
            }

            window.location.href =
                `analista.html?servidor=${encodeURIComponent(servidor.id)}`;

        });

    });


    // ----------------------------------------------------------
    // CARREGAMENTO
    // ----------------------------------------------------------

    async function carregar() {

        if (carregando) return;

        carregando = true;

        el("statusAtualizacao").textContent = "Atualizando dados...";

        try {

            const resultados = await Promise.all(
                estado.servidores.map(async (srv) => {

                    const resumo = await Monit.resumo(
                        srv,
                        estado.periodo
                    );

                    return {
                        servidor: srv,
                        resumo,
                        status: Monit.statusGeral(resumo, srv)
                    };

                })
            );

            estado.resumos = resultados;

            renderizar();

        } catch (erro) {

            console.error("Erro ao carregar painel:", erro);

            el("statusAtualizacao").textContent =
                "Erro ao atualizar os dados.";

            el("listaPrioridades").innerHTML = `
        <p class="gestor-vazio">
          Não foi possível carregar as informações.
        </p>
      `;

        } finally {

            carregando = false;

        }

    }

    const dadosMockados = {
        servidores: 12,
        online: 10,
        atencao: 1,
        criticos: 1,
        disponibilidade: 99.82,
        cpu: 42,
        memoria: 68,
        disco: 57,
        redeEntrada: 125.6,
        redeSaida: 84.3
    };

    // ----------------------------------------------------------
    // INICIALIZAÇÃO
    // ----------------------------------------------------------

    async function iniciar() {

        try {

            estado.servidores = await Monit.listarServidores();

            el("badgeDemo").hidden = !Monit.CONFIG.demonstracao;

            el("periodoGestor").addEventListener("change", (e) => {

                estado.periodo = Number(e.target.value);

                carregar();

            });

            await carregar();

            intervalo = setInterval(
                carregar,
                Monit.CONFIG.intervaloMs
            );

        } catch (erro) {

            console.error("Erro ao iniciar gestor:", erro);

            el("statusAtualizacao").textContent =
                "Falha ao iniciar o monitoramento.";

        }

    }

    iniciar();

})();
