var database = require("../database/config");

function listar(empresa) {
  var instrucaoSql = `
    SELECT servidor.id, equipamento.numero_serie, servidor.hostname, servidor.ip,
      equipamento.mac_address, servidor.responsabilidade, servidor.sistema_operacional,
      servidor.versao_so, servidor.status AS stats,
      CONCAT_WS(' - ',
        CONCAT_WS(', ', NULLIF(localidade.logradouro, ''), NULLIF(localidade.bairro, '')),
        CONCAT(localidade.cidade, '/', localidade.estado)
      ) AS local
    FROM servidor
    JOIN equipamento ON servidor.id_equipamento = equipamento.id
    JOIN localidade ON servidor.id_local = localidade.id
    JOIN empresa ON equipamento.id_empresa = empresa.id
    WHERE empresa.razao_social = ?
    ORDER BY servidor.hostname;`;

  return database.executar(instrucaoSql, [empresa]);
}

function listarLocalidades(empresa) {
  var instrucaoSql = `
    SELECT localidade.id,
      CONCAT_WS(' - ',
        CONCAT_WS(', ', NULLIF(localidade.logradouro, ''), NULLIF(localidade.bairro, '')),
        CONCAT(localidade.cidade, '/', localidade.estado)
      ) AS nome
    FROM localidade
    JOIN empresa ON empresa.localidadeId = localidade.id
    WHERE empresa.razao_social = ?
    ORDER BY localidade.cidade, localidade.logradouro;`;

  return database.executar(instrucaoSql, [empresa]);
}

function validarNumeroSerie(numeroSerie, empresa) {
  var instrucaoSql = `
    SELECT equipamento.id AS id_equipamento, equipamento.numero_serie, equipamento.mac_address
    FROM equipamento
    JOIN empresa ON equipamento.id_empresa = empresa.id
    WHERE equipamento.numero_serie = ?
      AND empresa.razao_social = ?
      AND NOT EXISTS (
        SELECT 1 FROM servidor
        WHERE servidor.id_equipamento = equipamento.id
      )
    LIMIT 1;`;

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

  return database.executar(instrucaoSql, [
    dados.hostname,
    dados.ip,
    dados.sistemaOperacional,
    dados.versaoSo,
    dados.responsabilidade,
    dados.idLocal,
    dados.numeroSerie,
    dados.empresa
  ]);
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
  listarLocalidades,
  validarNumeroSerie,
  cadastrar,
  deletar
};
