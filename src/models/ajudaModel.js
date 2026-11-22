var database = require("../database/config");

function listarServidores(empresa) {
  return database.executar(`
    SELECT servidor.id, servidor.hostname
    FROM servidor
    JOIN equipamento ON servidor.id_equipamento = equipamento.id
    JOIN empresa ON equipamento.id_empresa = empresa.id
    WHERE empresa.razao_social = ?
    ORDER BY servidor.hostname;
  `, [empresa]);
}

function obterLimites(empresa, idServidor) {
  return database.executar(`
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
    LEFT JOIN tipo_componente
      ON tipo_componente.id = componente.id_tipo
      AND tipo_componente.nome IN ('CPU', 'Memoria', 'Disco')
    LEFT JOIN parametro_limite
      ON parametro_limite.id_componente = componente.id
      AND parametro_limite.ativo = 1
      AND parametro_limite.criticidade IN ('ALTO', 'CRITICO')
    WHERE empresa.razao_social = ? AND servidor.id = ?
    GROUP BY servidor.id, servidor.hostname, componente.id, tipo_componente.nome
    ORDER BY FIELD(tipo_componente.nome, 'CPU', 'Memoria', 'Disco');
  `, [empresa, idServidor])
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

module.exports = {
  listarServidores: listarServidores,
  obterLimites: obterLimites
};