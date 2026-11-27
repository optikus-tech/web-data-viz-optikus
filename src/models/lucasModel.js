var database = require("../database/config");
var JANELA_PREVISAO_MINUTOS = 30;
var MARGEM_COLETA_MINUTOS = 1;

function listarServidores(empresa) {
  var instrucao = `
    SELECT
      servidor.id,
      servidor.hostname,
      MAX(captura.criado_em) AS ultima_captura_cpu
    FROM servidor
    JOIN equipamento ON servidor.id_equipamento = equipamento.id
    JOIN empresa ON equipamento.id_empresa = empresa.id
    JOIN componente
      ON componente.id_servidor = servidor.id
      AND componente.status = 'ATIVO'
    JOIN tipo_componente
      ON tipo_componente.id = componente.id_tipo
      AND tipo_componente.nome = 'CPU'
    LEFT JOIN captura
      ON captura.id_componente = componente.id
    WHERE empresa.razao_social = ?
    GROUP BY servidor.id, servidor.hostname
    ORDER BY ultima_captura_cpu IS NULL, ultima_captura_cpu DESC, servidor.hostname;
  `;
  return database.executar(instrucao, [empresa]);
}

function buscarDadosDashboard(empresa, idServidor) {
  var instrucao = `
    SELECT
      servidor.id AS id_servidor,
      servidor.hostname,
      servidor.responsabilidade,
      captura.valor,
      captura.criado_em,
      (
        SELECT MIN(limite_alerta.valor_minimo)
        FROM parametro_limite limite_alerta
        WHERE limite_alerta.id_componente = componente.id
          AND limite_alerta.criticidade = 'ALTO'
          AND limite_alerta.ativo = 1
      ) AS limite_atencao,
      (
        SELECT MIN(limite_critico.valor_minimo)
        FROM parametro_limite limite_critico
        WHERE limite_critico.id_componente = componente.id
          AND limite_critico.criticidade = 'CRITICO'
          AND limite_critico.ativo = 1
      ) AS limite_critico
    FROM servidor
    JOIN equipamento ON servidor.id_equipamento = equipamento.id
    JOIN empresa ON equipamento.id_empresa = empresa.id
    JOIN componente ON componente.id_servidor = servidor.id
      AND componente.status = 'ATIVO'
    JOIN tipo_componente ON componente.id_tipo = tipo_componente.id
    LEFT JOIN captura ON captura.id = (
      SELECT captura_recente.id
      FROM captura captura_recente
      WHERE captura_recente.id_componente = componente.id
      ORDER BY captura_recente.criado_em DESC, captura_recente.id DESC
      LIMIT 1
    )
    WHERE empresa.razao_social = ?
      AND servidor.id = ?
      AND tipo_componente.nome = 'CPU'
    LIMIT 1;
  `;
  return database.executar(instrucao, [empresa, idServidor]);
}

function buscarHistoricoCpu(empresa, idServidor) {
  var instrucao = `
    SELECT
      captura.valor,
      captura.criado_em
    FROM captura
    JOIN componente ON captura.id_componente = componente.id
    JOIN tipo_componente ON componente.id_tipo = tipo_componente.id
    JOIN servidor ON componente.id_servidor = servidor.id
    JOIN equipamento ON servidor.id_equipamento = equipamento.id
    JOIN empresa ON equipamento.id_empresa = empresa.id
    WHERE empresa.razao_social = ?
      AND servidor.id = ?
      AND tipo_componente.nome = 'CPU'
      AND componente.status = 'ATIVO'
      AND captura.criado_em >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 65 MINUTE)
    ORDER BY captura.criado_em ASC;
  `;
  return database.executar(instrucao, [empresa, idServidor]);
}

function buscarEstatisticasHistoricas(empresa, idServidor) {
  var instrucao = `
    SELECT
      HOUR(captura.criado_em) AS hora,
      AVG(captura.valor) AS media,
      MIN(captura.valor) AS minimo,
      MAX(captura.valor) AS maximo,
      COUNT(*) AS quantidade,
      COUNT(CASE
        WHEN LEAST(
          ABS(
            TIME_TO_SEC(TIME(captura.criado_em))
            - TIME_TO_SEC(TIME(CURRENT_TIMESTAMP))
          ),
          86400 - ABS(
            TIME_TO_SEC(TIME(captura.criado_em))
            - TIME_TO_SEC(TIME(CURRENT_TIMESTAMP))
          )
        ) <= 1800 THEN 1
      END) AS faixa_quantidade,
      SUM(CASE
        WHEN LEAST(
          ABS(
            TIME_TO_SEC(TIME(captura.criado_em))
            - TIME_TO_SEC(TIME(CURRENT_TIMESTAMP))
          ),
          86400 - ABS(
            TIME_TO_SEC(TIME(captura.criado_em))
            - TIME_TO_SEC(TIME(CURRENT_TIMESTAMP))
          )
        ) <= 1800 THEN captura.valor
        ELSE 0
      END) AS faixa_soma,
      MIN(CASE
        WHEN LEAST(
          ABS(
            TIME_TO_SEC(TIME(captura.criado_em))
            - TIME_TO_SEC(TIME(CURRENT_TIMESTAMP))
          ),
          86400 - ABS(
            TIME_TO_SEC(TIME(captura.criado_em))
            - TIME_TO_SEC(TIME(CURRENT_TIMESTAMP))
          )
        ) <= 1800 THEN captura.valor
      END) AS faixa_minimo,
      MAX(CASE
        WHEN LEAST(
          ABS(
            TIME_TO_SEC(TIME(captura.criado_em))
            - TIME_TO_SEC(TIME(CURRENT_TIMESTAMP))
          ),
          86400 - ABS(
            TIME_TO_SEC(TIME(captura.criado_em))
            - TIME_TO_SEC(TIME(CURRENT_TIMESTAMP))
          )
        ) <= 1800 THEN captura.valor
      END) AS faixa_maximo
    FROM captura
    JOIN componente ON captura.id_componente = componente.id
    JOIN tipo_componente ON componente.id_tipo = tipo_componente.id
    JOIN servidor ON componente.id_servidor = servidor.id
    JOIN equipamento ON servidor.id_equipamento = equipamento.id
    JOIN empresa ON equipamento.id_empresa = empresa.id
    WHERE empresa.razao_social = ?
      AND servidor.id = ?
      AND tipo_componente.nome = 'CPU'
      AND componente.status = 'ATIVO'
      AND captura.criado_em >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)
    GROUP BY HOUR(captura.criado_em)
    ORDER BY hora;
  `;
  return database.executar(instrucao, [empresa, idServidor]);
}

function calcularRegressao(medicoes) {
  if (!medicoes.length) return { slope: 0, r2: 0 };

  var inicio = new Date(medicoes[0].criado_em).getTime();
  var pontos = medicoes.map(function (medicao) {
    return {
      x: (new Date(medicao.criado_em).getTime() - inicio) / 60000,
      y: Number(medicao.valor)
    };
  });
  var n = pontos.length;
  var somaX = pontos.reduce(function (total, ponto) { return total + ponto.x; }, 0);
  var somaY = pontos.reduce(function (total, ponto) { return total + ponto.y; }, 0);
  var somaXY = pontos.reduce(function (total, ponto) { return total + ponto.x * ponto.y; }, 0);
  var somaX2 = pontos.reduce(function (total, ponto) { return total + ponto.x * ponto.x; }, 0);
  var somaY2 = pontos.reduce(function (total, ponto) { return total + ponto.y * ponto.y; }, 0);
  var denominador = n * somaX2 - somaX * somaX;
  var slope = denominador === 0 ? 0 : (n * somaXY - somaX * somaY) / denominador;
  var intercepto = (somaY - slope * somaX) / n;
  var mediaY = somaY / n;
  var sqe = pontos.reduce(function (total, ponto) {
    var residuo = ponto.y - (intercepto + slope * ponto.x);
    return total + residuo * residuo;
  }, 0);
  var sqt = pontos.reduce(function (total, ponto) {
    var diferenca = ponto.y - mediaY;
    return total + diferenca * diferenca;
  }, 0);
  var r2 = sqt === 0 ? 1 : Math.max(0, 1 - sqe / sqt);

  return { slope: slope, r2: r2, intercepto: intercepto };
}

function arredondar(valor, casas) {
  var fator = Math.pow(10, casas);
  return Math.round(valor * fator) / fator;
}

function obterDashboard(empresa, idServidor) {
  return Promise.all([
    buscarDadosDashboard(empresa, idServidor),
    buscarHistoricoCpu(empresa, idServidor),
    buscarEstatisticasHistoricas(empresa, idServidor)
  ]).then(function (resultados) {
    var dadosAtuais = resultados[0][0] || null;
    var medicoesHistorico = resultados[1];
    var estatisticasHistoricas = resultados[2];
    var perfilHistorico = estatisticasHistoricas.map(function (faixa) {
      return {
        hora: Number(faixa.hora),
        media: Number(faixa.media),
        minimo: Number(faixa.minimo),
        maximo: Number(faixa.maximo),
        quantidade: Number(faixa.quantidade)
      };
    });
    var faixaConsolidada = estatisticasHistoricas.reduce(function (total, faixa) {
      total.quantidade += Number(faixa.faixa_quantidade) || 0;
      total.soma += Number(faixa.faixa_soma) || 0;

      if (faixa.faixa_minimo !== null && faixa.faixa_minimo !== undefined) {
        var minimo = Number(faixa.faixa_minimo);
        total.minimo = total.minimo === null ? minimo : Math.min(total.minimo, minimo);
      }

      if (faixa.faixa_maximo !== null && faixa.faixa_maximo !== undefined) {
        var maximo = Number(faixa.faixa_maximo);
        total.maximo = total.maximo === null ? maximo : Math.max(total.maximo, maximo);
      }

      return total;
    }, { quantidade: 0, soma: 0, minimo: null, maximo: null });

    if (!dadosAtuais) {
      return {
        servidor: null,
        cpuAtual: null,
        historico: [],
        perfilHistorico: [],
        previsao: {
          disponivel: false,
          motivo: "SERVIDOR_NAO_ENCONTRADO",
          minutosDisponiveis: 0
        }
      };
    }

    var cpuAtual = dadosAtuais.valor === null ? null : Number(dadosAtuais.valor);
    var limiteAtencao = dadosAtuais.limite_atencao === null ? 80 : Number(dadosAtuais.limite_atencao);
    var limiteCritico = dadosAtuais.limite_critico === null ? 85 : Number(dadosAtuais.limite_critico);
    var medicoes = [];
    var minutosDisponiveis = 0;

    if (medicoesHistorico.length) {
      var ultimo = new Date(medicoesHistorico[medicoesHistorico.length - 1].criado_em).getTime();
      var inicioJanela = ultimo - (JANELA_PREVISAO_MINUTOS + MARGEM_COLETA_MINUTOS) * 60000;
      medicoes = medicoesHistorico.filter(function (medicao) {
        return new Date(medicao.criado_em).getTime() >= inicioJanela;
      });

      if (medicoes.length > 1) {
        var primeiro = new Date(medicoes[0].criado_em).getTime();
        minutosDisponiveis = Math.min(
          JANELA_PREVISAO_MINUTOS,
          Math.max(0, (ultimo - primeiro) / 60000)
        );
      }
    }

    var regressao = calcularRegressao(medicoes);
    var disponivel = medicoes.length >= 2
      && minutosDisponiveis >= JANELA_PREVISAO_MINUTOS
      && regressao.r2 >= 0.7
      && regressao.slope >= 0.05;
    var tempoAteLimite = null;

    if (disponivel && cpuAtual !== null && cpuAtual < limiteCritico) {
      tempoAteLimite = (limiteCritico - cpuAtual) / regressao.slope;
      if (!Number.isFinite(tempoAteLimite) || tempoAteLimite > 180) tempoAteLimite = null;
    }

    var confiabilidade = "Baixa";
    if (regressao.r2 >= 0.9) confiabilidade = "Alta";
    else if (regressao.r2 >= 0.7) confiabilidade = "Moderada";

    var faixaHistorica = faixaConsolidada.quantidade > 0
      ? {
          media: arredondar(faixaConsolidada.soma / faixaConsolidada.quantidade, 2),
          minimo: arredondar(faixaConsolidada.minimo, 2),
          maximo: arredondar(faixaConsolidada.maximo, 2),
          quantidade: faixaConsolidada.quantidade
        }
      : null;

    var previsaoStatus = disponivel ? "OK" : "INDISPONIVEL";
    if (medicoes.length < 2 || minutosDisponiveis < JANELA_PREVISAO_MINUTOS) previsaoStatus = "COLETANDO";

    return {
      servidor: {
        id: dadosAtuais.id_servidor,
        hostname: dadosAtuais.hostname,
        responsabilidade: dadosAtuais.responsabilidade
      },
      cpuAtual: cpuAtual,
      limiteAtencao: limiteAtencao,
      limiteCritico: limiteCritico,
      tendencia: regressao.slope > 0.15
        ? "CRESCENDO"
        : regressao.slope < -0.15
          ? "CAINDO"
          : "ESTAVEL",
      inclinacaoPorMinuto: arredondar(regressao.slope, 4),
      confiabilidade: confiabilidade,
      r2: arredondar(regressao.r2, 4),
      tempoAteLimite: tempoAteLimite === null ? null : arredondar(tempoAteLimite, 1),
      previsao: {
        disponivel: disponivel,
        status: previsaoStatus,
        minutosDisponiveis: Math.floor(minutosDisponiveis)
      },
      faixaHistorica: faixaHistorica,
      perfilHistorico: perfilHistorico,
      historico: medicoesHistorico.map(function (medicao) {
        return {
          valor: Number(medicao.valor),
          criado_em: medicao.criado_em
        };
      })
    };
  });
}

module.exports = {
  listarServidores,
  obterDashboard
};