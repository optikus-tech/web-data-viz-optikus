let L_ATENCAO = 80, L_CRITICO = 90;
const JANELA = 30, HISTORICO_GRAFICO = 60, PREVISAO_GRAFICO = 60;
const X_MIN = -HISTORICO_GRAFICO, X_MAX = PREVISAO_GRAFICO;
    const COR = {
      normal: '#269b7a', atencao: '#f59e0b', critico: '#ef4444',
      indisp: '#7b8495', anomalia: '#7555f5', coletando: '#176ca5'
    };
    const TAG = {
      normal: 'Normal', atencao: 'Atenção', critico: 'Crítico',
      indisp: 'Previsão indisponível', anomalia: 'Fora do padrão', coletando: 'Coletando dados'
    };
    const ICONES = {
      normal: '<polyline points="20 6 9 17 4 12"/>',
      atencao: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      indisp: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      anomalia: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
      coletando: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
    };
    ICONES.critico = ICONES.atencao;

    /* ---------- utilidades ---------- */
    const g = (h, c, w) => Math.exp(-0.5 * Math.pow((h - c) / w, 2));
    // perfil típico de 24h: manhã (entrada), almoço, fim de tarde (saída)
    const perfil = h => 30 + 14 * g(h, 13.5, 4.5) + 22 * g(h, 8.7, 0.9) + 28 * g(h, 12.6, 0.8) + 24 * g(h, 17.9, 1) + 8 * g(h, 14.5, 2.2);
    const hhmm = min => {
      min = ((Math.round(min) % 1440) + 1440) % 1440;
      return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
    };
    const pct = v => Math.round(v) + '%';
    const num = (v, d = 2) => v.toFixed(d).replace('.', ',');
    const $ = id => document.getElementById(id);

    /* ---------- cenários simulados ---------- */
    const CENARIOS = {
      coletando: {
        nome: '1 · Coletando os 30 minutos iniciais', agora: 9 * 60 + 18, coletados: 18, atual: 61, slope: 0.15,
        previsao: 'coletando', confiab: null, r2: null, esp: { media: 60, min: 52, max: 70 },
        banner: () => ({
          tipo: 'coletando', titulo: 'Coletando dados para gerar previsão',
          texto: 'A primeira previsão será liberada quando houver pelo menos 30 minutos de dados para o cálculo da tendência.'
        })
      },
      confiavel: {
        nome: '2 · Previsão confiável (tendência crescente)', agora: 17 * 60 + 5, atual: 68, slope: 17 / 27,
        previsao: 'ok', confiab: 'Alta', r2: 0.94, esp: { media: 62, min: 52, max: 74 },
        banner: (c, d) => ({
          tipo: 'atencao', titulo: 'Tendência de crescimento detectada',
          texto: `Mantendo a tendência atual, a CPU poderá atingir ${L_CRITICO}% em aproximadamente ${Math.round(d.m)} minutos.`
        })
      },
      saturacao: {
        nome: '3 · Tendência indica possível saturação', agora: 12 * 60 + 24, atual: 81, slope: 0.7,
        previsao: 'ok', confiab: 'Alta', r2: 0.96, esp: { media: 78, min: 70, max: 88 },
        banner: (c, d) => ({
          tipo: 'critico', titulo: 'Risco de saturação em curto prazo',
          texto: `Mantendo a tendência atual, a CPU poderá atingir ${L_CRITICO}% em aproximadamente ${Math.round(d.m)} minutos. O aumento coincide com o horário de almoço, mas o ritmo de crescimento merece atenção.`
        })
      },
      instavel: {
        nome: '4 · Tendência instável (previsão indisponível)', agora: 14 * 60 + 36, atual: 66, slope: 0, modo: 'instavel',
        previsao: 'indisponivel', confiab: 'Baixa', r2: 0.12, esp: { media: 62, min: 52, max: 74 },
        banner: () => ({
          tipo: 'indisp', titulo: 'Previsão indisponível',
          texto: 'Previsão indisponível: comportamento insuficientemente consistente. A oscilação recente é alta e não há tendência clara, então nenhuma projeção foi gerada.'
        })
      },
      esperado: {
        nome: '5 · Consumo alto, mas dentro do esperado', agora: 12 * 60 + 40, atual: 76, slope: 0.02,
        previsao: 'ok', confiab: 'Alta', r2: 0.9, esp: { media: 72, min: 65, max: 80 },
        banner: c => ({
          tipo: 'normal', titulo: 'Consumo elevado, porém esperado para este horário',
          texto: `A CPU está em ${c.atual}%, dentro da faixa histórica de ${c.esp.min}–${c.esp.max}% para o período do almoço. A tendência está estável e não indica saturação.`
        })
      },
      anomalia: {
        nome: '6 · Consumo fora do padrão histórico', agora: 15 * 60 + 40, atual: 82, slope: 0.3,
        previsao: 'ok', confiab: 'Moderada', r2: 0.81, esp: { media: 58, min: 50, max: 66 }, desde: 18,
        banner: (c, d) => ({
          tipo: 'anomalia', titulo: 'Comportamento fora do padrão',
          texto: `O consumo está ${Math.round(d.dif)} pontos percentuais acima da média histórica para este horário. Mantendo a tendência atual, a CPU poderá atingir ${L_CRITICO}% em aproximadamente ${Math.round(d.m)} minutos.`
        })
      },
      critico: {
        nome: '7 · Limite crítico excedido', agora: 16 * 60 + 15, atual: 88, slope: 0.35,
        previsao: 'ok', confiab: 'Alta', r2: 0.93, esp: { media: 63, min: 55, max: 72 }, desde: 9,
        banner: c => ({
          tipo: 'critico', titulo: 'Limite crítico excedido',
          texto: `A CPU está em ${c.atual}%, acima do limite crítico de ${L_CRITICO}%, e a tendência continua de alta. O consumo também está muito acima do esperado para este horário.`
        })
      }
    };

    /* ---------- derivações ---------- */
    function derivar(c) {
      const ok = c.previsao === 'ok';
      let m = null;
      if (ok && c.slope > 0.05 && c.atual < L_CRITICO) m = (L_CRITICO - c.atual) / c.slope;
      let tend;
      if (c.previsao === 'coletando') tend = { rot: 'Aguardando dados', seta: '…', cor: 'coletando' };
      else if (c.previsao === 'indisponivel') tend = { rot: 'Instável', seta: '↕', cor: 'indisp' };
      else if (c.slope > 0.15) tend = { rot: 'Crescendo', seta: '↑', cor: c.slope > 0.5 ? 'atencao' : 'atencao' };
      else if (c.slope < -0.15) tend = { rot: 'Caindo', seta: '↓', cor: 'normal' };
      else tend = { rot: 'Estável', seta: '→', cor: 'normal' };
      const dif = c.atual - c.esp.media;
      const hist = c.espDisponivel === false
        ? 'indisponivel'
        : c.atual > c.esp.max ? 'acima' : c.atual < c.esp.min ? 'abaixo' : 'dentro';
      const cpuCor = c.atual >= L_CRITICO ? 'critico' : c.atual >= L_ATENCAO ? 'atencao' : 'normal';
      return { ok, m, tend, dif, hist, cpuCor };
    }

    /* série de dados reais (1 ponto por minuto) */
    function serie(c) {
      if (c.dadosReais) {
        if (!Array.isArray(c.historico) || !c.historico.length) {
          return [{ x: 0, y: c.atual }];
        }

        const ancora = new Date(c.historico[c.historico.length - 1].criado_em).getTime();
        return c.historico.map(function (medicao) {
          const x = (new Date(medicao.criado_em).getTime() - ancora) / 60000;
          return { x: x, y: Number(medicao.valor) };
        }).filter(function (ponto) {
          return ponto.x >= X_MIN && ponto.x <= 0;
        });
      }

      if (Array.isArray(c.historico) && c.historico.length) {
        const ancora = new Date(c.historico[c.historico.length - 1].criado_em).getTime();
        return c.historico.map(function (medicao) {
          const x = (new Date(medicao.criado_em).getTime() - ancora) / 60000;
          return { x: x, y: Number(medicao.valor) };
        }).filter(function (ponto) {
          return ponto.x >= X_MIN && ponto.x <= 0;
        });
      }
      const n = c.coletados || 61, pts = [];
      const ruido = i => c.modo === 'instavel'
        ? 11 * Math.sin(i * 0.55) + 7 * Math.sin(i * 1.3 + 2) + (i % 9 === 0 ? 6 : 0)
        : 1.1 * Math.sin(i * 1.7) + 0.7 * Math.sin(i * 0.63 + 1);
      for (let i = -(n - 1); i <= 0; i++) {
        const d = -i;
        let base;
        if (c.modo === 'instavel') base = c.atual;
        else if (d <= JANELA) base = c.atual - c.slope * d;
        else base = (c.atual - c.slope * JANELA) - 0.05 * (d - JANELA);
        const y = Math.max(3, Math.min(99, base + ruido(i) - ruido(0)));
        pts.push({ x: i, y });
      }
      return pts;
    }

    /* ---------- plugin do gráfico: região de projeção e rótulo do cruzamento ---------- */
    let cur = null, curD = null, graficoPrev = null, graficoPerf = null, xMaxGrafico = X_MAX;
    const pluginAgora = {
      id: 'agora',
      beforeDatasetsDraw(chart) {
        const { ctx, chartArea: a, scales: { x } } = chart;
        const x0 = x.getPixelForValue(0);
        ctx.save();
        ctx.fillStyle = 'rgba(22,40,95,.04)';
        ctx.fillRect(x0, a.top, a.right - x0, a.bottom - a.top);
        ctx.restore();
      },
      afterDatasetsDraw(chart) {
        if (!cur) return;
        const { ctx, chartArea: a, scales: { x, y } } = chart;
        const x0 = x.getPixelForValue(0);
        ctx.save();
        ctx.strokeStyle = '#98a2b3'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(x0, a.top); ctx.lineTo(x0, a.bottom); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '600 11px Inter, sans-serif'; ctx.fillStyle = '#667085';
        ctx.textAlign = 'right'; ctx.fillText('Dados reais', x0 - 8, a.top + 14);
        ctx.textAlign = 'left'; ctx.fillText('Projeção', x0 + 8, a.top + 14);
        if (cur.previsao === 'ok' && curD.m != null && curD.m <= xMaxGrafico) {
          const px = x.getPixelForValue(curD.m), py = y.getPixelForValue(L_CRITICO);
          const txt = '≈ ' + hhmm(cur.agora + curD.m) + ' · limite crítico';
          const w = ctx.measureText(txt).width + 16;
          let bx = Math.max(a.left, Math.min(px - w / 2, a.right - w));
          const by = py - 34;
          ctx.fillStyle = '#ef4444';
          ctx.beginPath(); ctx.roundRect(bx, by, w, 22, 6); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
          ctx.fillText(txt, bx + 8, by + 15);
        }
        ctx.restore();
      }
    };

    /* ---------- gráfico principal ---------- */
    function montarGraficoPrevisao(c, d) {
      const real = serie(c);
      const inicioHistorico = real.length > 1
        ? Math.max(X_MIN, real[0].x)
        : -PREVISAO_GRAFICO;
      xMaxGrafico = real.length
        ? Math.min(X_MAX, Math.max(1, Math.abs(inicioHistorico)))
        : X_MAX;
      const intervaloTicks = Math.max(1, Math.ceil(xMaxGrafico / 4));
      const off = c.esp.media - perfil(c.agora / 60);
      const hiD = c.esp.max - c.esp.media, loD = c.esp.media - c.esp.min;
      const mid = [], hi = [], lo = [];
      for (let x = inicioHistorico; x <= xMaxGrafico; x += 3) {
        const m0 = perfil((c.agora + x) / 60) + off;
        mid.push({ x, y: m0 });
        hi.push({ x, y: Math.min(100, m0 + hiD) });
        lo.push({ x, y: Math.max(0, m0 - loD) });
      }
      let trend = [], proj = [], cross = [];
      if (c.previsao === 'ok') {
        trend = [{ x: -JANELA, y: c.atual - c.slope * JANELA }, { x: 0, y: c.atual }];
        const xEnd = d.m != null ? Math.min(xMaxGrafico, d.m + 10)
          : (c.slope > 0.02 ? Math.min(xMaxGrafico, (99 - c.atual) / c.slope) : xMaxGrafico);
        proj = [{ x: 0, y: c.atual }, { x: xEnd, y: c.atual + c.slope * xEnd }];
        if (d.m != null && d.m <= xMaxGrafico) cross = [{ x: d.m, y: L_CRITICO }];
      }
      const limite = v => [{ x: inicioHistorico, y: v }, { x: xMaxGrafico, y: v }];

      if (graficoPrev) graficoPrev.destroy();
      graficoPrev = new Chart($('graficoPrevisao'), {
        type: 'line',
        plugins: [pluginAgora],
        data: {
          datasets: [
            { label: 'Cruzamento estimado', data: cross, type: 'line', showLine: false, order: 0, tip: true,
              pointRadius: 7, pointHoverRadius: 8, pointBackgroundColor: '#ef4444', pointBorderColor: '#fff', pointBorderWidth: 2 },
            { label: 'Uso real', data: real, order: 1, tip: true, borderColor: '#16285f', backgroundColor: 'rgba(22,40,95,0.06)',
              fill: 'origin', borderWidth: 2.2, tension: 0.2,
              pointRadius: 0, pointHoverRadius: 4, pointHitRadius: 8 },
            { label: 'Tendência (regressão)', data: trend, order: 2, tip: false, borderColor: '#6aa9d8', borderWidth: 2, pointRadius: 0, fill: false },
            { label: 'Projeção', data: proj, order: 3, tip: true, borderColor: '#176ca5', borderWidth: 2.5, borderDash: [7, 5], pointRadius: 0, fill: false },
            { label: 'Limite de atenção', data: limite(L_ATENCAO), order: 4, tip: false, borderColor: '#f59e0b', borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, fill: false },
            { label: 'Limite crítico', data: limite(L_CRITICO), order: 4, tip: false, borderColor: '#ef4444', borderWidth: 1.8, pointRadius: 0, fill: false },
            { label: 'Média histórica', data: mid, order: 5, tip: false, borderColor: 'rgba(100,110,130,.55)', borderWidth: 1.2, borderDash: [2, 3], pointRadius: 0, fill: false },
            { label: 'banda-min', data: lo, order: 6, tip: false, borderWidth: 0, pointRadius: 0, fill: false },
            { label: 'banda-max', data: hi, order: 6, tip: false, borderWidth: 0, pointRadius: 0, backgroundColor: 'rgba(123,132,149,.16)', fill: '-1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
          interaction: { mode: 'nearest', axis: 'x', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              filter: item => item.dataset.tip,
              callbacks: {
                title: items => items.length ? hhmm(c.agora + items[0].parsed.x) : '',
                label: ctx => ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(0) + '%'
              }
            }
          },
          scales: {
            x: {
              type: 'linear', min: inicioHistorico, max: xMaxGrafico, grid: { display: false },
              title: { display: true, text: 'Horário' },
              ticks: { stepSize: intervaloTicks, maxRotation: 0, callback: v => hhmm(c.agora + v) }
            },
            y: {
              min: 0, max: 100, grid: { color: '#edf0f5' },
              title: { display: true, text: 'Uso da CPU (%)' },
              ticks: { stepSize: 20, callback: v => v + '%' }
            }
          }
        }
      });
    }

    /* ---------- gráfico do perfil de 24h ---------- */
    function montarGraficoPerfil(c, d) {
      const perfilHistorico = new Map((c.perfilHistorico || []).map(faixa => [faixa.hora, faixa]));
      const horas = Array.from({ length: 24 }, (_, hora) => {
        const faixa = perfilHistorico.get(hora);
        return {
          x: hora + 0.5,
          media: faixa ? faixa.media : null,
          minimo: faixa ? faixa.minimo : null,
          maximo: faixa ? faixa.maximo : null
        };
      });
      const mid = horas.map(faixa => ({ x: faixa.x, y: faixa.media }));
      const hi = horas.map(faixa => ({ x: faixa.x, y: faixa.maximo }));
      const lo = horas.map(faixa => ({ x: faixa.x, y: faixa.minimo }));
      const corAgora = d.hist === 'indisponivel' ? COR.indisp : d.hist === 'dentro' ? COR.normal : COR.anomalia;
      if (graficoPerf) graficoPerf.destroy();
      graficoPerf = new Chart($('graficoPerfil'), {
        type: 'line',
        data: {
          datasets: [
            { label: 'Agora', data: [{ x: c.agora / 60, y: c.atual }], showLine: false, order: 0, pointRadius: 7,
              pointBackgroundColor: corAgora, pointBorderColor: '#fff', pointBorderWidth: 2 },
            { label: 'Média histórica', data: mid, order: 1, borderColor: '#176ca5', borderWidth: 2, pointRadius: 3, tension: 0.2, spanGaps: false, fill: false },
            { label: 'banda-min', data: lo, order: 2, borderWidth: 0, pointRadius: 0, tension: 0.35, fill: false },
            { label: 'Faixa histórica', data: hi, order: 2, borderWidth: 0, pointRadius: 0, tension: 0.2, backgroundColor: 'rgba(23,108,165,.14)', fill: '-1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
          interaction: { mode: 'nearest', intersect: true },
          plugins: {
            legend: { display: false },
            tooltip: {
              filter: item => item.dataset.label === 'Agora' || item.dataset.label === 'Média histórica',
              callbacks: {
                title: items => items.length ? hhmm(items[0].parsed.x * 60) : '',
                label: ctx => ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(0) + '%'
              }
            }
          },
          scales: {
            x: { type: 'linear', min: 0, max: 24, grid: { display: false },
              ticks: { stepSize: 4, callback: v => String(v).padStart(2, '0') + 'h' } },
            y: { min: 0, max: 100, grid: { color: '#edf0f5' }, ticks: { stepSize: 25, callback: v => v + '%' } }
          }
        }
      });
    }

    /* ---------- renderização da tela ---------- */
    let segRecalc = 0;
    function cor(el, tipo) { el.style.setProperty('--c', COR[tipo]); }

    function render(id) {
      const c = id === 'dados-reais' ? cenarioReal : CENARIOS[id], d = derivar(c);
      cur = c; curD = d; segRecalc = 12;
      const b = c.banner(c, d);

      // resumo da previsão nos indicadores
      $('estadoTitulo').textContent = b.titulo;
      $('estadoTexto').textContent = b.texto;
      $('estadoTag').textContent = TAG[b.tipo];

      // 1 · agora
      cor($('cardCpu'), d.cpuCor);
      $('cpuValor').textContent = c.atual + '%';
      $('cpuSub').textContent = d.cpuCor === 'critico' ? 'Acima do limite crítico' : d.cpuCor === 'atencao' ? 'Acima do limite de atenção' : 'Abaixo do limite de atenção';
      $('gauge').style.background = `linear-gradient(90deg,#d6f1e8 0 ${L_ATENCAO}%,#fde9b0 ${L_ATENCAO}% ${L_CRITICO}%,#fbd0d0 ${L_CRITICO}% 100%)`;
      $('gaugeMarker').style.left = c.atual + '%';
      $('limAtencao').textContent = L_ATENCAO + '%';
      $('limCritico').textContent = L_CRITICO + '%';

      // 2 · para onde vai
      cor($('cardTend'), d.tend.cor);
      $('tendValor').textContent = d.tend.seta + ' ' + d.tend.rot;
      $('tendSub').textContent = c.previsao === 'coletando' ? 'Disponível após 30 min de coleta'
        : c.previsao === 'indisponivel' ? 'Sem direção clara nos últimos 30 min'
        : (c.slope >= 0 ? '+' : '') + num(c.slope) + ' p.p. por minuto';

      const nivel = { Alta: 3, Moderada: 2, Baixa: 1 }[c.confiab] || 0;
      const corConf = { Alta: COR.normal, Moderada: COR.atencao, Baixa: '#f97316' }[c.confiab] || COR.indisp;
      $('cardConf').style.setProperty('--c', corConf);
      $('confValor').textContent = c.confiab || '—';
      [...$('confBarras').children].forEach((el, i) => el.style.background = i < nivel ? corConf : '#e4e7ec');
      $('confSub').textContent = c.r2 != null ? 'Ajuste da reta: R² ' + num(c.r2) : 'Em coleta';

      const cs = $('cardSat');
      if (c.previsao === 'coletando') {
        cor(cs, 'coletando'); $('satValor').textContent = '—';
        $('satSub').textContent = 'Saturação estimada às —';
      } else if (c.previsao === 'indisponivel') {
        cor(cs, 'indisp'); $('satValor').textContent = '—';
        $('satSub').textContent = 'Previsão indisponível: comportamento insuficientemente consistente';
      } else if (c.atual >= L_CRITICO) {
        cor(cs, 'critico'); $('satValor').textContent = 'Excedido';
        $('satSub').textContent = `A CPU já está acima de ${L_CRITICO}%`;
      } else if (d.m != null) {
        cor(cs, d.m <= 10 ? 'critico' : 'atencao');
        $('satValor').textContent = '~' + Math.max(1, Math.round(d.m)) + ' min';
        $('satSub').textContent = `até ${L_CRITICO}% · por volta de ${hhmm(c.agora + d.m)} se a tendência se mantiver`;
      } else {
        cor(cs, 'normal'); $('satValor').textContent = 'Sem risco';
        $('satSub').textContent = `Tendência estável: nenhuma projeção de ${L_CRITICO}% no horizonte de ${X_MAX} min`;
      }
      $('satValor').className = 'pv-value' + ($('satValor').textContent.length > 8 ? ' menor' : '');

      // 3 · é normal?
      const dentro = d.hist === 'dentro';
      const historicoDisponivel = d.hist !== 'indisponivel';

      // gráficos
      cor($('overlay'), c.previsao === 'coletando' ? 'coletando' : 'indisp');
      const ov = $('overlay');
      if (c.previsao === 'coletando') {
        ov.style.display = 'block';
        $('overlayTitulo').textContent = 'Coletando dados para gerar previsão';
        $('overlayTexto').textContent = `Histórico disponível: ${c.coletados}/30 minutos`;
      } else if (c.previsao === 'indisponivel') {
        ov.style.display = 'block';
        $('overlayTitulo').textContent = 'Previsão indisponível';
        $('overlayTexto').textContent = 'Comportamento insuficientemente consistente. Nenhuma projeção é exibida.';
      } else ov.style.display = 'none';
      montarGraficoPrevisao(c, d);

      // comparação histórica
      $('histTituloSub').textContent = `Comportamento esperado para ${hhmm(c.agora)} com base nos últimos 30 dias`;
      $('hrAtual').textContent = c.atual + '%';
      $('hrMedia').textContent = historicoDisponivel ? c.esp.media + '%' : '—';
      $('hrDif').textContent = historicoDisponivel ? (d.dif >= 0 ? '+' : '') + Math.round(d.dif) + ' p.p.' : '—';
      const chip = $('hrChip');
      chip.style.setProperty('--c', !historicoDisponivel ? COR.indisp : dentro ? COR.normal : COR.anomalia);
      chip.textContent = !historicoDisponivel ? 'Sem histórico' : dentro ? 'Comportamento esperado' : 'Fora do padrão';
      $('rangeBand').style.display = historicoDisponivel ? '' : 'none';
      $('rangeAvg').style.display = historicoDisponivel ? '' : 'none';
      $('rangeBand').style.left = c.esp.min + '%';
      $('rangeBand').style.width = (c.esp.max - c.esp.min) + '%';
      $('rangeAvg').style.left = c.esp.media + '%';
      $('rangeNow').style.left = c.atual + '%';
      $('rangeNow').style.setProperty('--c', !historicoDisponivel ? COR.indisp : dentro ? COR.normal : COR.anomalia);
      $('rangeTexto').textContent = historicoDisponivel
        ? `${c.esp.min}–${c.esp.max}%`
        : 'Sem histórico por horário';
      montarGraficoPerfil(c, d);

      atualizarRecalc();
    }

    function atualizarRecalc() {
      if (!cur) {
        $('recalc').textContent = 'Aguardando dados do servidor';
        return;
      }
      $('recalc').textContent = cur.previsao === 'coletando'
        ? `Coleta em andamento · primeira previsão em ${30 - cur.coletados} min`
        : `Previsão recalculada há ${segRecalc}s`;
    }
    setInterval(() => { segRecalc = (segRecalc + 1) % 61; atualizarRecalc(); }, 1000);

    /* ---------- integração com dados reais ---------- */
    function requisicaoLucas(url, dados) {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      }).then(async function (resposta) {
        if (!resposta.ok) throw new Error(await resposta.text());
        return resposta.json();
      });
    }

    function converterDadosReais(dados) {
      L_ATENCAO = Number(dados.limiteAtencao) || 80;
      L_CRITICO = Number(dados.limiteCritico) || 90;

      const faixa = dados.faixaHistorica || { media: dados.cpuAtual || 0, minimo: 0, maximo: 100 };
      const status = dados.previsao.status;
      const minutos = dados.previsao.minutosDisponiveis;
      const previsao = status === 'COLETANDO'
        ? 'coletando'
        : status === 'INDISPONIVEL' || !dados.previsao.disponivel
          ? 'indisponivel'
          : 'ok';

      let banner;
      if (previsao === 'coletando') {
        banner = () => ({
          tipo: 'coletando',
          titulo: 'Coletando dados para gerar previsão',
          texto: 'A primeira previsão será liberada quando houver pelo menos 30 minutos de dados para o cálculo da tendência.'
        });
      } else if (previsao === 'indisponivel') {
        banner = () => ({
          tipo: 'indisp',
          titulo: 'Previsão indisponível',
          texto: 'Comportamento insuficientemente consistente. Nenhuma projeção foi gerada.'
        });
      } else {
        banner = (c, d) => ({
          tipo: dados.tempoAteLimite != null && dados.tempoAteLimite <= 10 ? 'critico' : 'atencao',
          titulo: dados.tendencia === 'CRESCENDO' ? 'Tendência de crescimento detectada' : 'Consumo estável ou em queda',
          texto: dados.tempoAteLimite != null
            ? `Mantendo a tendência atual, a CPU poderá atingir ${L_CRITICO}% em aproximadamente ${Math.round(dados.tempoAteLimite)} minutos.`
            : 'A tendência atual não indica uma possível saturação no horizonte de análise.'
        });
      }

      return {
        agora: dados.historico.length
          ? (new Date(dados.historico[dados.historico.length - 1].criado_em).getHours() * 60)
            + new Date(dados.historico[dados.historico.length - 1].criado_em).getMinutes()
          : (new Date().getHours() * 60) + new Date().getMinutes(),
        coletados: minutos,
        atual: Number(dados.cpuAtual),
        slope: Number(dados.inclinacaoPorMinuto),
        previsao: previsao,
        confiab: dados.confiabilidade,
        r2: Number(dados.r2),
        esp: { media: Number(faixa.media), min: Number(faixa.minimo), max: Number(faixa.maximo) },
        espDisponivel: Boolean(dados.faixaHistorica),
        perfilHistorico: dados.perfilHistorico,
        historico: dados.historico,
        dadosReais: true,
        banner: banner
      };
    }

    let servidorAtualId = null;
    let atualizacaoAutomatica = null;
    let cenarioReal = null;
    let requisicaoDashboardId = 0;

    function exibirErroCarregamento(titulo, mensagem) {
      cor($('cardSat'), 'indisp');
      cor($('cardConf'), 'indisp');
      cor($('cardTend'), 'indisp');
      $('estadoTitulo').textContent = titulo;
      $('estadoTexto').textContent = mensagem;
      $('estadoTag').textContent = TAG.indisp;
      $('satValor').textContent = '—';
      $('satSub').textContent = 'Previsão indisponível';
      $('confValor').textContent = '—';
      $('tendValor').textContent = '—';
      $('tendSub').textContent = mensagem;
    }

    function carregarServidorInicial(servidores, indice) {
      if (indice >= servidores.length) {
        exibirErroCarregamento(
          'Dados de CPU indisponíveis',
          'Nenhum servidor desta empresa possui uma captura válida de CPU.'
        );
        return Promise.resolve();
      }

      const servidor = servidores[indice];
      servidorAtualId = servidor.id;
      servidorSelect.value = String(servidor.id);
      return requisicaoLucas('/lucas/dashboard', {
        empresa: empresa,
        id_servidor: servidor.id
      }).then(function (dados) {
        if (dados.cpuAtual === null) return carregarServidorInicial(servidores, indice + 1);
        renderReal(dados);
      }).catch(function (erro) {
        console.error('Erro ao carregar dados iniciais da previsão:', erro);
        exibirErroCarregamento('Falha ao carregar os dados', erro.message);
      });
    }

    function carregarDadosReais() {
      if (!servidorAtualId) return;
      const requisicaoId = ++requisicaoDashboardId;
      const idServidor = servidorAtualId;
      const empresa = sessionStorage.getItem('empresa');
      requisicaoLucas('/lucas/dashboard', {
        empresa: empresa,
        id_servidor: idServidor
      }).then(function (dados) {
        if (requisicaoId === requisicaoDashboardId) renderReal(dados);
      }).catch(function (erro) {
        if (requisicaoId !== requisicaoDashboardId) return;
        console.error('Erro ao carregar dados reais da previsão:', erro);
        exibirErroCarregamento('Falha ao carregar os dados', erro.message);
      });
    }

    function renderReal(dados) {
      if (dados.cpuAtual === null) {
        exibirErroCarregamento(
          'Dados de CPU indisponíveis',
          'Este servidor ainda não possui uma captura válida de CPU.'
        );
        return;
      }
      $('servidorTitulo').textContent = dados.servidor.hostname;
      cenarioReal = converterDadosReais(dados);
      render('dados-reais');
    }

    const servidorSelect = $('servidorEscolhido');
    const empresa = sessionStorage.getItem('empresa');

    if (!empresa) {
      servidorSelect.replaceChildren(new Option('Faça login novamente', ''));
      exibirErroCarregamento(
        'Sessão não encontrada',
        'Entre novamente para carregar os servidores e as métricas da empresa.'
      );
    } else {
      requisicaoLucas('/lucas/listar', { empresa: empresa })
        .then(function (servidores) {
          servidorSelect.replaceChildren();
          if (!servidores.length) {
            servidorSelect.add(new Option('Nenhum servidor encontrado', ''));
            exibirErroCarregamento(
              'Nenhum servidor encontrado',
              'Não há servidores cadastrados para esta empresa.'
            );
            return;
          }
          servidores.forEach(function (servidor) {
            servidorSelect.add(new Option(servidor.hostname, servidor.id));
          });
          servidorSelect.addEventListener('change', function () {
            servidorAtualId = Number(servidorSelect.value);
            carregarDadosReais();
          });

          carregarServidorInicial(servidores, 0).then(function () {
            if (atualizacaoAutomatica) clearInterval(atualizacaoAutomatica);
            atualizacaoAutomatica = setInterval(carregarDadosReais, 15000);
          });
        })
        .catch(function (erro) {
          console.error('Erro ao listar servidores:', erro);
          servidorSelect.replaceChildren(new Option('Não foi possível carregar servidores', ''));
          exibirErroCarregamento('Falha ao listar servidores', erro.message);
        });
    }
