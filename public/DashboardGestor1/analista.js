/* Dashboard do ANALISTA: investigação técnica por servidor e componente */
(() => {
  const { COMPONENTES, NOMES, STATUS, LIMITES, fmt, r1 } = Monit;
  const el = (id) => document.getElementById(id);
  const CHAVE = { CPU: "CPU", RAM: "RAM", Disco: "Disco", Rede: "RedeIn" };
  const ROTULO = { CPU: "CPU", RAM: "RAM", Disco: "Disco", RedeIn: "Rede (entrada)" };
  const estado = { servidor: null, comp: "CPU", janela: 60 };
  let servidores = [], atual = {}, anterior = {},
    gMain, gDist, gCorr;

  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = "#9db4cb";
  const grade = "rgba(255, 255, 255, 0.07)";

  function criarGraficos() {
    gMain = new Chart(el("graficoMain"), {
      type: "line", data: { labels: [], datasets: [] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
        interaction: { intersect: false, mode: "index" },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12, boxHeight: 2, font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 10, maxRotation: 0 } },
          y: { min: 0, grid: { color: grade }, border: { display: false } }
        }
      }
    });
    gDist = new Chart(el("graficoDist"), {
      type: "bar",
      data: { labels: ["0–25%", "25–50%", "50–75%", "75–100%"], datasets: [{ data: [], backgroundColor: "#4aa8f0", borderRadius: 6, maxBarThickness: 40 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmt(c.parsed.y) + "% do período" } } },
        scales: {
          x: { grid: { display: false } },
          y: { min: 0, max: 100, ticks: { stepSize: 25, callback: (v) => v + "%" }, grid: { color: grade }, border: { display: false } }
        }
      }
    });

    // Gráfico de correlações
    gCorr = new Chart(el("graficoCorr"), {
      type: "bar",

      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderRadius: 6,
          barThickness: 24,
          maxBarThickness: 28
        }]
      },

      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,

        animation: {
          duration: 300
        },

        plugins: {
          legend: {
            display: false
          },

          tooltip: {
            callbacks: {
              label: (ctx) =>
                " Correlação: " + ctx.parsed.x.toFixed(2)
            }
          }
        },

        scales: {
          x: {
            min: -1,
            max: 1,

            ticks: {
              color: "#334155",
              stepSize: 0.5,
              font: {
                size: 10,
                weight: "600"
              }
            },

            grid: {
              color: grade
            },

            title: {
              display: true,
              text: "Intensidade da correlação",
              color: "#102b50",
              font: {
                size: 10,
                weight: "700"
              }
            }
          },

          y: {
            ticks: {
              color: "#102b50",
              font: {
                size: 11,
                weight: "700"
              }
            },

            grid: {
              display: false
            }
          }
        }
      },

      plugins: [{
        id: "valoresCorrelacao",

        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          const meta = chart.getDatasetMeta(0);
          const valores = chart.data.datasets[0].data;

          ctx.save();
          ctx.font = "bold 11px Inter";
          ctx.fillStyle = "#102b50";
          ctx.textBaseline = "middle";

          meta.data.forEach((barra, i) => {
            const valor = valores[i];
            const pos = barra.getProps(["x", "y"], true);

            ctx.textAlign = valor >= 0 ? "left" : "right";

            ctx.fillText(
              valor.toFixed(2),
              pos.x + (valor >= 0 ? 7 : -7),
              pos.y
            );
          });

          ctx.restore();
        }
      }]
    });


  }


  function obterServidorSelecionado() {

    const parametros = new URLSearchParams(
      window.location.search
    );

    return parametros.get("servidor");

  }

  function carregarServidorAnalista() {

    const servidorId = obterServidorSelecionado();

    if (!servidorId) {
      console.log("Nenhum servidor selecionado.");
      return;
    }

    // Identificação dos servidores mockados

    const params = new URLSearchParams(window.location.search);

    const servidoresId = params.get("servidor");
    const servidorNome = params.get("nome");
    const servidorIp = params.get("ip");

    console.log("ID:", servidorId);
    console.log("Servidor:", servidorNome);
    console.log("IP:", servidorIp);



    //    const servidores = [
    //      {
    //        id: "srv01",
    //        nome: "Servidor 01 - Serv-10099",
    //        ip: "192.168.1.10"
    //      },
    //      {
    //        id: "srv02",
    //      nome: "Servidor 02 - Serv-10100",
    //    ip: "192.168.1.20"
    //},
    //{
    //id: "srv03",
    //  nome: "Servidor 03 - Serv-10101",
    //    ip: "192.168.1.30"
    //},

    //  {
    //id: "srv04",
    //nome: "Servidor 04 - Serv-10102",
    //ip: "192.168.1.40"
    //}
    //];

    const servidor = servidores.find(
      item => item.id === servidorId
    );

    if (!servidor) {
      console.error("Servidor inválido:", servidorId);
      return;
    }

    // Atualiza o título da tela
    const titulo = document.getElementById("nomeServidor");

    if (titulo) {
      titulo.textContent = servidor.nome;
    }

    // Disponibiliza os dados para a lógica existente
    window.servidorSelecionado = servidor;

    console.log("Servidor selecionado:", servidor);

  }

  document.addEventListener(
    "DOMContentLoaded",
    carregarServidorAnalista
  );


  function eventos(srv, un) {
    const linhas = [];
    Monit.PERCENTUAIS.forEach((c) => Monit.ocorrencias(srv, c, atual[c]).forEach((o) => linhas.push({
      t: o.inicio, nivel: o.nivel, tipo: STATUS[o.nivel].texto, comp: NOMES[c], valor: fmt(o.pico) + "%",
      ref: "limite " + o.limite + "%", sit: o.ativo ? "Ativo" : "Encerrado"
    })));
    const s = atual[CHAVE[estado.comp]], d = s.slice(1).map((p, i) => p.v - s[i].v), sd = Monit.desvio(d);
    d.forEach((x, i) => {
      if (sd > 0 && Math.abs(x) > 2 * sd) linhas.push({
        t: s[i + 1].t, nivel: "normal", tipo: "Variação brusca", comp: NOMES[estado.comp],
        valor: fmt(s[i + 1].v) + un + " (" + (x > 0 ? "+" : "") + r1(x) + ")", ref: "> 2σ (σ = " + fmt(sd) + ")", sit: "—"
      });
    });
    return linhas.sort((a, b) => b.t - a.t);
  }

  function render() {
    const srv = servidores.find((s) => s.id === estado.servidor), c = estado.comp;
    const pct = c !== "Rede", un = pct ? "%" : " Mbps", chave = CHAVE[c];
    const s = atual[chave], sp = anterior[chave], e = Monit.stats(s), ep = Monit.stats(sp), n = s.length;
    const rot = s.map((p) => Monit.hora(p.t));

    el("srvTitulo").textContent = srv.id + " · " + srv.hostname + " · " + NOMES[c] + " · últimos " + estado.janela + " min";
    el("abasServidor").innerHTML = servidores.map((x) => Monit.botaoHTML(x.id, x.id, x.id === estado.servidor, srv.comunicando ? "normal" : "semdados")).join("");
    el("abasComp").innerHTML = COMPONENTES.map((x) => Monit.botaoHTML(x, NOMES[x], x === c)).join("");
    el("badgeDemo").hidden = !Monit.CONFIG.demonstracao;

    // métricas detalhadas
    const dif = r1(e.media - ep.media);
    const celulas = [["Atual", fmt(e.atual) + un], ["Média", fmt(e.media) + un], ["Mínimo", fmt(e.min) + un], ["Máximo", fmt(e.max) + un],
    ["P95", fmt(e.p95) + un], ["Desvio-padrão", fmt(e.desvio)], ["Tendência/h", (Monit.tendenciaHora(s) > 0 ? "+" : "") + fmt(Monit.tendenciaHora(s)) + un],
    ["Média vs. período anterior", (dif > 0 ? "+" : "") + fmt(dif) + un]];
    el("stats").innerHTML = celulas.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("");

    // gráfico principal: atual x anterior + limites
    const cores = s.map((p) => pct ? STATUS[Monit.classificar(c, p.v)].cor : "#4aa8f0");
    const ds = [
      {
        label: "Período atual", data: s.map((p) => p.v), borderColor: "#4aa8f0", backgroundColor: "rgba(74, 168, 240, 0.14)", fill: true,
        tension: 0.25, borderWidth: 2, pointRadius: n <= 60 ? 2 : 0, pointBackgroundColor: cores, pointBorderColor: cores
      },
      { label: "Período anterior", data: sp.map((p) => p.v), borderColor: "#6f8aa6", borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, tension: 0.25, fill: false }
    ];
    if (!pct) ds.push({ label: "Saída (Mbps)", data: atual.RedeOut.map((p) => p.v), borderColor: "#a78bfa", borderWidth: 2, pointRadius: 0, tension: 0.25, fill: false });
    ds.push(...Monit.linhasLimite(c, n));
    gMain.data.labels = rot; gMain.data.datasets = ds;
    gMain.options.scales.y.max = pct ? 100 : undefined;
    gMain.options.scales.y.ticks.callback = (v) => v + (pct ? "%" : "");
    gMain.update();
    el("tituloMain").textContent = NOMES[c] + (pct ? " · utilização (%)" : " · tráfego (Mbps)");

    // distribuição do tempo por faixa
    const esc = s.map((p) => (pct ? p.v : (p.v / srv.redeCap) * 100)), faixas = [0, 0, 0, 0];
    esc.forEach((v) => faixas[Math.min(3, Math.floor(v / 25))]++);
    gDist.data.datasets[0].data = faixas.map((f) => r1((f / n) * 100));
    gDist.update();
    el("notaDist").textContent = pct ? "Percentual das capturas em cada faixa de utilização." : "Faixas em % da capacidade do link (" + srv.redeCap + " Mbps).";

    // correlações (indício de possíveis causas, não prova)
    // CORRELAÇÕES ENTRE COMPONENTES
    const cor = Object.keys(ROTULO)
      .filter((k) => k !== chave)
      .map((k) => ({
        k,
        r: Monit.correlacao(
          s.map((p) => p.v),
          atual[k].map((p) => p.v)
        )
      }))
      .filter((x) => Number.isFinite(x.r) && Math.abs(x.r) >= 0.5)
      .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
      .slice(0, 3);

    gCorr.data.labels = cor.length
      ? cor.map((x) => ROTULO[x.k])
      : ["Sem correlação relevante"];

    gCorr.data.datasets[0].data = cor.length
      ? cor.map((x) => x.r)
      : [0];

    gCorr.data.datasets[0].backgroundColor = cor.length
      ? cor.map((x) =>
        x.r >= 0 ? "#173e69" : "#d97706"
      )
      : ["#cbd5e1"];

    gCorr.update();
    // ocorrências e variações
    const ev = eventos(srv, un).slice(0, 5);
    el("corpoEventos").innerHTML = ev.length
      ? ev.map((x) => `<tr><td>${Monit.hora(x.t)}</td><td><span class="ov-pill ${x.nivel}">${x.tipo}</span></td><td>${x.comp}</td><td>${x.valor}</td><td>${x.ref}</td><td>${x.sit}</td></tr>`).join("")
      : '<tr><td colspan="6">Nenhuma ocorrência no período.</td></tr>';
    el("notaLimites").textContent = COMPONENTES.filter((x) => !LIMITES[x]).map((x) => NOMES[x]).join(", ") + ": limite não informado no DER (sem alerta automático).";
  }

  async function carregar() {
    try {
      const srv = servidores.find((s) => s.id === estado.servidor), n = estado.janela, chaves = ["CPU", "RAM", "Disco", "RedeIn", "RedeOut"];
      const [a, p] = await Promise.all([0, n].map((d) => Promise.all(chaves.map((k) => Monit.carregarSerie(srv, k, n, d)))));
      chaves.forEach((k, i) => { atual[k] = a[i]; anterior[k] = p[i]; });
      render();
    } catch (err) {
      el("corpoEventos").innerHTML = '<tr><td colspan="6">' + err.message + "</td></tr>";
    }
  }

  async function iniciar() {
    servidores = await Monit.listarServidores();
    estado.servidor = servidores[0].id;
    criarGraficos();
    Monit.aoClicar(el("abasServidor"), (id) => { estado.servidor = id; carregar(); });
    Monit.aoClicar(el("abasComp"), (id) => { estado.comp = id; carregar(); });
    el("periodo").addEventListener("change", (e) => { estado.janela = Number(e.target.value); carregar(); });
    await carregar();
    setInterval(carregar, Monit.CONFIG.intervaloMs);
  }

  iniciar();
})();
