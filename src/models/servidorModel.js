var database = require("../database/config");

var metricasMonitoradas = [
  { tipo: "CPU", nome: "Processador" },
  { tipo: "Memoria", nome: "Memória RAM" },
  { tipo: "Disco", nome: "Disco Principal" }
];

var limitesPadraoPorResponsabilidade = {
  Armazenamento: {
    CPU: [80, 90],
    Memoria: [80, 90],
    Disco: [85, 95]
  },
  "Processamento de IA": {
    CPU: [85, 95],
    Memoria: [90, 97],
    Disco: [80, 90]
  },
  NVR: {
    CPU: [80, 90],
    Memoria: [85, 95],
    Disco: [85, 95]
  },
  "Gateway de Streaming": {
    CPU: [75, 90],
    Memoria: [80, 90],
    Disco: [80, 90]
  }
};

function obterIdAlerta(transacao, criticidade) {
  return transacao.executar(`
    SELECT id
    FROM alerta
    WHERE nivel = ? AND status = 'ABERTO'
    ORDER BY id
    LIMIT 1
    FOR UPDATE;
  `, [criticidade]).then(function (alertas) {
    if (alertas.length) return alertas[0].id;
    return transacao.executar(
      "INSERT INTO alerta (nivel, status) VALUES (?, 'ABERTO');",
      [criticidade]
    ).then(function (resultado) {
      return resultado.insertId;
    });
  });
}

function inserirFaixasPadrao(transacao, idComponente, limites) {
  var inicioAlerta = limites[0];
  var inicioCritico = limites[1];
  var faixas = [
    { minimo: 0, maximo: inicioAlerta - 0.01, criticidade: "MEDIO" },
    { minimo: inicioAlerta, maximo: inicioCritico - 0.01, criticidade: "ALTO" },
    { minimo: inicioCritico, maximo: 100, criticidade: "CRITICO" }
  ];

  return faixas.reduce(function (promessa, faixa) {
    return promessa.then(function () {
      return obterIdAlerta(transacao, faixa.criticidade)
        .then(function (idAlerta) {
          return transacao.executar(`
            INSERT INTO parametro_limite
              (valor_minimo, valor_maximo, criticidade, id_componente, alertaId, ativo)
            VALUES (?, ?, ?, ?, ?, 1);
          `, [
            faixa.minimo,
            faixa.maximo,
            faixa.criticidade,
            idComponente,
            idAlerta
          ]);
        });
    });
  }, Promise.resolve());
}

function criarMonitoramentoPadrao(transacao, idServidor, responsabilidade) {
  var perfil = limitesPadraoPorResponsabilidade[responsabilidade];
  if (!perfil) {
    var erroResponsabilidade = new Error("Não há perfil padrão para esta responsabilidade.");
    erroResponsabilidade.code = "PERFIL_NAO_ENCONTRADO";
    return Promise.reject(erroResponsabilidade);
  }

  return metricasMonitoradas.reduce(function (promessa, metrica) {
    return promessa.then(function () {
      return transacao.executar(`
        INSERT INTO tipo_componente (nome)
        VALUES (?)
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
      `, [metrica.tipo]).then(function (tipos) {
        return transacao.executar(`
          INSERT INTO componente
            (nome, unidade_medida, status, id_servidor, id_tipo)
          VALUES (?, '%', 'ATIVO', ?, ?);
        `, [metrica.nome, idServidor, tipos.insertId]).then(function (componente) {
          return inserirFaixasPadrao(
            transacao,
            componente.insertId,
            perfil[metrica.tipo]
          );
        });
      });
    });
  }, Promise.resolve());
}

function listar(empresa) {
  var instrucaoSql = `
        SELECT *
        FROM vwListarServidor
        WHERE empresa_razao_social = ?
        ORDER BY hostname;
        `;


  return database.executar(instrucaoSql, [empresa]);
}

function obterDadosDashboard(empresa, idServidor, tipoComponente) {
  var instrucaoServidores = `
    SELECT
      servidor.id AS id_servidor,
      servidor.hostname,
      servidor.ip,
      servidor.responsabilidade,
      servidor.status AS status_servidor,
      servidor.ultima_comunicacao,
      CONCAT_WS(' - ', localidade.bairro, CONCAT(localidade.cidade, '/', localidade.estado)) AS localizacao,
      componente.id AS id_componente,
      componente.nome AS nome_componente,
      componente.unidade_medida,
      tipo_componente.nome AS tipo_componente,
      captura_atual.valor,
      DATE_FORMAT(captura_atual.criado_em, '%Y-%m-%d %H:%i:%s') AS captura_criada_em,
      parametro_limite.valor_minimo,
      parametro_limite.valor_maximo,
      parametro_limite.criticidade,
      (
        SELECT MIN(limite_critico.valor_minimo)
        FROM parametro_limite limite_critico
        WHERE limite_critico.id_componente = componente.id
          AND limite_critico.criticidade = 'CRITICO'
          AND limite_critico.ativo = 1
      ) AS limite_critico,
      alerta.nivel AS nivel_alerta,
      alerta.status AS status_alerta
    FROM servidor
    JOIN equipamento ON servidor.id_equipamento = equipamento.id
    JOIN empresa ON equipamento.id_empresa = empresa.id
    LEFT JOIN localidade ON servidor.id_local = localidade.id
    LEFT JOIN componente
      ON componente.id_servidor = servidor.id
      AND componente.status = 'ATIVO'
    LEFT JOIN tipo_componente ON componente.id_tipo = tipo_componente.id
    LEFT JOIN captura captura_atual
      ON captura_atual.id = (
        SELECT captura_recente.id
        FROM captura captura_recente
        WHERE captura_recente.id_componente = componente.id
        ORDER BY captura_recente.criado_em DESC, captura_recente.id DESC
        LIMIT 1
      )
    LEFT JOIN parametro_limite ON captura_atual.parametroId = parametro_limite.id
    LEFT JOIN alerta ON parametro_limite.alertaId = alerta.id
    WHERE empresa.razao_social = ?
    ORDER BY servidor.hostname, componente.id;
  `;

  return database.executar(instrucaoServidores, [empresa])
    .then(function (linhas) {
      var servidoresPorId = {};

      linhas.forEach(function (linha) {
        var chave = String(linha.id_servidor);
        if (!servidoresPorId[chave]) {
          servidoresPorId[chave] = {
            id: linha.id_servidor,
            hostname: linha.hostname,
            ip: linha.ip,
            responsabilidade: linha.responsabilidade,
            status: linha.status_servidor,
            ultima_comunicacao: linha.ultima_comunicacao,
            localizacao: linha.localizacao,
            metricas: []
          };
        }

        if (linha.id_componente === null) return;
        servidoresPorId[chave].metricas.push({
          id: linha.id_componente,
          nome: linha.nome_componente,
          tipo: linha.tipo_componente,
          unidade_medida: linha.unidade_medida,
          valor: linha.valor === null ? null : Number(linha.valor),
          criado_em: linha.captura_criada_em,
          valor_minimo: linha.valor_minimo === null ? null : Number(linha.valor_minimo),
          valor_maximo: linha.valor_maximo === null ? null : Number(linha.valor_maximo),
          limite_critico: linha.limite_critico === null ? null : Number(linha.limite_critico),
          criticidade: linha.criticidade,
          nivel_alerta: linha.nivel_alerta,
          status_alerta: linha.status_alerta
        });
      });

      var servidores = Object.keys(servidoresPorId).map(function (id) {
        return servidoresPorId[id];
      });
      if (!idServidor || !tipoComponente
        || !servidoresPorId[String(idServidor)]) {
        return { servidores: servidores, historico: [] };
      }

      var instrucaoHistorico = `
        SELECT
          AVG(captura.valor) AS valor,
          MAX(captura.valor) AS pico_hora,
          DATE_FORMAT(MIN(captura.criado_em), '%Y-%m-%d %H:00:00') AS criado_em,
          componente.unidade_medida
        FROM captura
        JOIN componente ON captura.id_componente = componente.id
        JOIN tipo_componente ON componente.id_tipo = tipo_componente.id
        JOIN servidor ON componente.id_servidor = servidor.id
        JOIN equipamento ON servidor.id_equipamento = equipamento.id
        JOIN empresa ON equipamento.id_empresa = empresa.id
        WHERE empresa.razao_social = ?
          AND servidor.id = ?
          AND tipo_componente.nome = ?
          AND captura.criado_em >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 48 HOUR)
        GROUP BY componente.id, DATE(captura.criado_em), HOUR(captura.criado_em)
        ORDER BY DATE(captura.criado_em) DESC, HOUR(captura.criado_em) DESC
        LIMIT 48;
      `;

      return database.executar(instrucaoHistorico, [empresa, idServidor, tipoComponente])
        .then(function (historico) {
          return {
            servidores: servidores,
            historico: historico.map(function (leitura) {
              return {
                valor: Number(leitura.valor),
                pico_hora: Number(leitura.pico_hora),
                criado_em: leitura.criado_em,
                unidade_medida: leitura.unidade_medida
              };
            })
          };
        });
    });
}

function listarLocalidades(empresa) {
  var instrucaoSql = `
      SELECT id, nome
      FROM vwListarLocalidades
      WHERE empresa_razao_social = ?
      ORDER BY nome;
`;

  return database.executar(instrucaoSql, [empresa]);
}

function validarNumeroSerie(numeroSerie, empresa) {
 var instrucaoSql = `
    SELECT id_equipamento, numero_serie, mac_address
    FROM vwValidarNumeroSerie
    WHERE numero_serie = ?
    AND empresa_razao_social = ?
    LIMIT 1;
`;

  return database.executar(instrucaoSql, [numeroSerie, empresa])
    .then(function (resultado) {
      return resultado[0] || null;
    });
}

function cadastrar(dados) {
  var instrucaoSql = `
    INSERT INTO servidor
      (id_equipamento, hostname, ip, sistema_operacional,
       versao_so, responsabilidade, id_local)
    SELECT equipamento.id, ?, ?, ?, ?, ?, localidade.id
    FROM equipamento
    JOIN empresa ON equipamento.id_empresa = empresa.id
    JOIN localidade ON localidade.id = ? AND localidade.id = empresa.localidadeId
    WHERE equipamento.numero_serie = ?
      AND empresa.razao_social = ?
      AND NOT EXISTS (
        SELECT 1 FROM servidor
        WHERE servidor.id_equipamento = equipamento.id
      );`;

  return database.executarTransacao(function (transacao) {
    return transacao.executar(instrucaoSql, [
      dados.hostname,
      dados.ip,
      dados.sistemaOperacional,
      dados.versaoSo,
      dados.responsabilidade,
      dados.idLocal,
      dados.numeroSerie,
      dados.empresa
    ]).then(function (resultado) {
      if (resultado.affectedRows === 0) return resultado;
      return criarMonitoramentoPadrao(
        transacao,
        resultado.insertId,
        dados.responsabilidade
      ).then(function () {
        return resultado;
      });
    });
  });
}

function listarLimites(empresa, idServidor) {
  var instrucaoSql = `
    SELECT
      servidor.id AS id_servidor,
      servidor.hostname,
      tipo_componente.nome AS tipo,
      MAX(CASE WHEN parametro_limite.criticidade = 'ALTO'
        THEN parametro_limite.valor_minimo END) AS inicio_alerta,
      MAX(CASE WHEN parametro_limite.criticidade = 'CRITICO'
        THEN parametro_limite.valor_minimo END) AS inicio_critico
    FROM servidor
    JOIN equipamento ON servidor.id_equipamento = equipamento.id
    JOIN empresa ON equipamento.id_empresa = empresa.id
    LEFT JOIN componente
      ON componente.id_servidor = servidor.id
      AND componente.status = 'ATIVO'
    LEFT JOIN tipo_componente ON componente.id_tipo = tipo_componente.id
    LEFT JOIN parametro_limite
      ON parametro_limite.id_componente = componente.id
      AND parametro_limite.ativo = 1
    WHERE empresa.razao_social = ? AND servidor.id = ?
    GROUP BY servidor.id, servidor.hostname, componente.id, tipo_componente.nome
    ORDER BY FIELD(tipo_componente.nome, 'CPU', 'Memoria', 'Disco');
  `;

  return database.executar(instrucaoSql, [empresa, idServidor])
    .then(function (linhas) {
      if (!linhas.length) return null;
      return {
        id_servidor: linhas[0].id_servidor,
        hostname: linhas[0].hostname,
        metricas: linhas.filter(function (linha) {
          return linha.tipo !== null;
        }).map(function (linha) {
          return {
            tipo: linha.tipo,
            inicio_alerta: linha.inicio_alerta === null
              ? null
              : Number(linha.inicio_alerta),
            inicio_critico: linha.inicio_critico === null
              ? null
              : Number(linha.inicio_critico)
          };
        })
      };
    });
}

function salvarLimites(empresa, idServidor, limites) {
  return database.executarTransacao(function (transacao) {
    return transacao.executar(`
      SELECT servidor.id
      FROM servidor
      JOIN equipamento ON servidor.id_equipamento = equipamento.id
      JOIN empresa ON equipamento.id_empresa = empresa.id
      WHERE empresa.razao_social = ? AND servidor.id = ?
      FOR UPDATE;
    `, [empresa, idServidor]).then(function (servidores) {
      if (!servidores.length) {
        var erroServidor = new Error("Servidor não encontrado nesta empresa.");
        erroServidor.code = "SERVIDOR_NAO_ENCONTRADO";
        throw erroServidor;
      }

      return transacao.executar(`
        SELECT componente.id, tipo_componente.nome AS tipo
        FROM componente
        JOIN tipo_componente ON componente.id_tipo = tipo_componente.id
        WHERE componente.id_servidor = ?
          AND componente.status = 'ATIVO'
          AND tipo_componente.nome IN ('CPU', 'Memoria', 'Disco')
        FOR UPDATE;
      `, [idServidor]).then(function (componentes) {
        var componentesPorTipo = {};
        componentes.forEach(function (componente) {
          if (componentesPorTipo[componente.tipo]) {
            var erroDuplicado = new Error("Há componentes duplicados para " + componente.tipo + ".");
            erroDuplicado.code = "COMPONENTE_DUPLICADO";
            throw erroDuplicado;
          }
          componentesPorTipo[componente.tipo] = componente.id;
        });

        var faltantes = metricasMonitoradas.filter(function (metrica) {
          return !componentesPorTipo[metrica.tipo];
        });
        if (faltantes.length) {
          var erroComponente = new Error("Componentes de monitoramento ainda não foram configurados.");
          erroComponente.code = "COMPONENTES_NAO_CONFIGURADOS";
          throw erroComponente;
        }

        return limites.reduce(function (promessa, limite) {
          return promessa.then(function () {
            var idComponente = componentesPorTipo[limite.tipo];
            var faixas = [
              {
                minimo: 0,
                maximo: Number((limite.inicio_alerta - 0.01).toFixed(2)),
                criticidade: "MEDIO"
              },
              {
                minimo: limite.inicio_alerta,
                maximo: Number((limite.inicio_critico - 0.01).toFixed(2)),
                criticidade: "ALTO"
              },
              {
                minimo: limite.inicio_critico,
                maximo: 100,
                criticidade: "CRITICO"
              }
            ];

            return transacao.executar(`
              UPDATE parametro_limite
              SET ativo = 0
              WHERE id_componente = ? AND ativo = 1;
            `, [idComponente]).then(function () {
              return faixas.reduce(function (promessaFaixa, faixa) {
                return promessaFaixa.then(function () {
                  return obterIdAlerta(transacao, faixa.criticidade)
                    .then(function (idAlerta) {
                      return transacao.executar(`
                        INSERT INTO parametro_limite
                          (valor_minimo, valor_maximo, criticidade, id_componente, alertaId, ativo)
                        VALUES (?, ?, ?, ?, ?, 1);
                      `, [
                        faixa.minimo,
                        faixa.maximo,
                        faixa.criticidade,
                        idComponente,
                        idAlerta
                      ]);
                    });
                });
              }, Promise.resolve());
            });
          });
        }, Promise.resolve());
      });
    });
  });
}

function deletar(id, empresa) {
  var instrucaoSql = `
    DELETE servidor
    FROM servidor
    JOIN equipamento ON servidor.id_equipamento = equipamento.id
    JOIN empresa ON equipamento.id_empresa = empresa.id
    WHERE servidor.id = ? AND empresa.razao_social = ?;`;

  return database.executar(instrucaoSql, [id, empresa]);
}

module.exports = {
  listar,
  obterDadosDashboard,
  listarLocalidades,
  validarNumeroSerie,
  listarLimites,
  salvarLimites,
  cadastrar,
  deletar
};
