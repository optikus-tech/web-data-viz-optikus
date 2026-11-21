/* ==========================================================
   Camada de dados compartilhada (dashboard do gestor e do analista)
   Baseada no DER: servidor, componente, tipo_componente, captura,
   parametro_limite, alerta e incidente.
   ========================================================== */
const Monit = (() => {
  const CONFIG = { demonstracao: true, intervaloMs: 10000 };

  // Espelha parametro_limite por tipo de componente.
  // Alerta 79% / crítico 90% = regra atual do projeto.
  // null = limite NÃO INFORMADO: o painel não classifica nem gera alerta.
  const LIMITES = {
    CPU:   { alerta: 79, critico: 90 },
    RAM:   { alerta: 79, critico: 90 },
    Disco: { alerta: 79, critico: 90 },
    Rede:  null
  };
  const NOMES = { CPU: "CPU", RAM: "RAM", Disco: "DISCO", Rede: "REDE" };
  const COMPONENTES = ["CPU", "RAM", "Disco", "Rede"];
  const PERCENTUAIS = ["CPU", "RAM", "Disco"];
  const STATUS = {
    normal:    { texto: "Normal",               cor: "#4aa8f0" },
    alerta:    { texto: "Alerta",               cor: "#fbbf24" },
    critico:   { texto: "Crítico",              cor: "#f87171" },
    semlimite: { texto: "Limite não informado", cor: "#9db4cb" },
    semdados:  { texto: "Sem comunicação",      cor: "#98a2b3" }
  };

  // ---------- utilitários ----------
  const r1 = (x) => Math.round(x * 10) / 10;
  const media = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  const desvio = (v) => { const m = media(v); return Math.sqrt(media(v.map((x) => (x - m) ** 2))); };
  const fmt = (n) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const hora = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  function classificar(comp, valor) {
    const l = LIMITES[comp];
    if (!l) return "semlimite";
    if (valor >= l.critico) return "critico";
    if (valor >= l.alerta) return "alerta";
    return "normal";
  }

  function stats(serie) {
    const v = serie.map((p) => p.v), ord = [...v].sort((a, b) => a - b);
    return {
      atual: v[v.length - 1], media: r1(media(v)), min: ord[0], max: ord[ord.length - 1],
      p95: ord[Math.min(v.length - 1, Math.floor(0.95 * v.length))], desvio: r1(desvio(v))
    };
  }

  // inclinação da reta de tendência, em unidade por hora (1 captura por minuto)
  function tendenciaHora(serie) {
    const y = serie.map((p) => p.v), mx = (y.length - 1) / 2, my = media(y);
    let num = 0, den = 0;
    y.forEach((v, x) => { num += (x - mx) * (v - my); den += (x - mx) ** 2; });
    return den ? r1((num / den) * 60) : 0;
  }

  function correlacao(a, b) {
    const ma = media(a), mb = media(b);
    let num = 0, da = 0, db = 0;
    a.forEach((v, i) => { num += (v - ma) * (b[i] - mb); da += (v - ma) ** 2; db += (b[i] - mb) ** 2; });
    return da && db ? num / Math.sqrt(da * db) : 0;
  }

  // ---------- fonte de dados ----------
  // DEMONSTRAÇÃO: servidores e capturas simulados de forma determinística (sem Math.random).
  // INTEGRAÇÃO: trocar listarServidores() e carregarSerie() por consultas às tabelas
  // servidor / componente / captura (cada captura: valor + criado_em).
  const SERVIDORES_DEMO = [
    { id: "SERV-10099", hostname: "srv-10099", comunicando: true,
      cpu: { nucleos: 8, ghz: 3.2 }, ramTotal: 16, discoTotal: 480, redeCap: 1000,
      perfil: { CPU: [46, 16, 0.4], RAM: [62, 6, 1.1, 10], Disco: [82, 1.5, 2.0], RedeIn: [320, 140, 0.2], RedeOut: [120, 60, 1.7] } },
    { id: "SERV-10100", hostname: "srv-10100", comunicando: true,
      cpu: { nucleos: 16, ghz: null }, ramTotal: 32, discoTotal: 960, redeCap: 1000,
      perfil: { CPU: [66, 12, 1.0, 14], RAM: [84, 9, 0.3], Disco: [55, 1, 0.8], RedeIn: [540, 260, 0.8], RedeOut: [210, 90, 2.2] } }
  ];

  function sinal([base, amp, fase, salto = 0], t) {
    return base + amp * Math.sin((2 * Math.PI * t) / 23 + fase)
      + (amp / 3) * Math.sin((2 * Math.PI * t) / 7 + 2 * fase) + (t % 45 >= 30 ? salto : 0);
  }

  async function listarServidores() {
    if (!CONFIG.demonstracao) throw new Error("Integração com a tabela servidor ainda não configurada.");
    return SERVIDORES_DEMO;
  }

  // chave: CPU, RAM, Disco (%), RedeIn, RedeOut (Mbps). desloc = capturas puladas (período anterior)
  async function carregarSerie(srv, chave, n, desloc = 0) {
    if (!CONFIG.demonstracao) throw new Error("Integração com a tabela captura ainda não configurada.");
    const t0 = Math.floor(Date.now() / 60000) - desloc, pct = PERCENTUAIS.includes(chave);
    return Array.from({ length: n }, (_, i) => {
      const t = t0 - (n - 1 - i), v = sinal(srv.perfil[chave], t);
      return { t: new Date(t * 60000), v: r1(pct ? Math.min(100, Math.max(0, v)) : Math.max(0, v)) };
    });
  }

  // ---------- resumo do servidor (usado pelo gestor) ----------
  async function resumo(srv, n = 30) {
    const [cpu, ram, disco, rin, rout] = await Promise.all(
      ["CPU", "RAM", "Disco", "RedeIn", "RedeOut"].map((k) => carregarSerie(srv, k, n)));
    const base = (comp, s, extra) => {
      const e = stats(s);
      return { comp, serie: s, ...e, status: srv.comunicando ? classificar(comp, e.atual) : "semdados", ...extra(e) };
    };
    const gb = (e, total) => { const usado = r1((e.atual * total) / 100); return { usado, livre: r1(total - usado) }; };
    return {
      CPU: base("CPU", cpu, (e) => ({ valor: e.atual, unidade: "%", pct: e.atual,
        extra: (srv.cpu.nucleos ? srv.cpu.nucleos + " núcleos" : "núcleos não informados") + " · " + (srv.cpu.ghz ? srv.cpu.ghz + " GHz" : "frequência não informada") })),
      RAM: base("RAM", ram, (e) => { const g = gb(e, srv.ramTotal);
        return { valor: g.usado, unidade: "GB", pct: e.atual, extra: fmt(e.atual) + "% de " + srv.ramTotal + " GB · livre " + fmt(g.livre) + " GB" }; }),
      Disco: base("Disco", disco, (e) => { const g = gb(e, srv.discoTotal);
        return { valor: g.usado, unidade: "GB", pct: e.atual, extra: fmt(e.atual) + "% de " + srv.discoTotal + " GB · livre " + fmt(g.livre) + " GB" }; }),
      Rede: base("Rede", rin, (e) => ({ valor: e.atual, unidade: "Mbps", pct: r1((e.atual / srv.redeCap) * 100),
        extra: "↓ " + fmt(e.atual) + " · ↑ " + fmt(rout[rout.length - 1].v) + " Mbps (cap. " + srv.redeCap + ")" })),
      series: { RedeIn: rin, RedeOut: rout }
    };
  }

  function statusGeral(r, srv) {
    if (!srv.comunicando || !r) return "semdados";
    const l = COMPONENTES.map((c) => r[c].status);
    return l.includes("critico") ? "critico" : l.includes("alerta") ? "alerta" : "normal";
  }

  // Agrupa capturas consecutivas fora do normal em uma ocorrência (base da tabela alerta).
  function ocorrencias(srv, comp, serie) {
    const l = LIMITES[comp], saida = [];
    if (!l) return saida;
    let o = null;
    serie.forEach((p) => {
      const nv = classificar(comp, p.v);
      if (nv !== "normal") {
        if (!o) o = { servidor: srv.id, comp, nivel: nv, pico: p.v, inicio: p.t, ativo: false };
        o.valor = p.v; o.fim = p.t; o.pico = Math.max(o.pico, p.v);
        if (nv === "critico") o.nivel = "critico";
      } else if (o) { saida.push(o); o = null; }
    });
    if (o) { o.ativo = true; saida.push(o); }
    return saida.map((x) => ({ ...x, limite: l[x.nivel] }));
  }

  // ---------- helpers de gráfico e de tela ----------
  function linhasLimite(comp, n) {
    const l = LIMITES[comp];
    if (!l) return [];
    const mk = (label, v, cor) => ({ label, data: Array(n).fill(v), borderColor: cor, borderDash: [6, 4], borderWidth: 1.2, pointRadius: 0, fill: false });
    return [mk("Limite de alerta", l.alerta, STATUS.alerta.cor), mk("Limite crítico", l.critico, STATUS.critico.cor)];
  }

  const botaoHTML = (id, rotulo, ativo, dot) =>
    `<button type="button" class="ov-componente-btn${ativo ? " ativo" : ""}" data-id="${id}">${dot ? `<i class="ov-dot ${dot}"></i>` : ""}${rotulo}</button>`;

  function aoClicar(box, fn) {
    const acao = (e) => { const b = e.target.closest("[data-id]"); if (b && box.contains(b)) fn(b.dataset.id); };
    box.addEventListener("click", acao);
    box.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); acao(e); } });
  }

  return { CONFIG, LIMITES, NOMES, COMPONENTES, PERCENTUAIS, STATUS, r1, media, desvio, fmt, hora,
    classificar, stats, tendenciaHora, correlacao, listarServidores, carregarSerie, resumo,
    statusGeral, ocorrencias, linhasLimite, botaoHTML, aoClicar };
})();
