var database = require("../database/config");

function listar(empresa) {
  var instrucaoSql = `
        SELECT *
        FROM vwListarServidor
        WHERE empresa_razao_social = ?
        ORDER BY hostname;
        `;


  return database.executar(instrucaoSql, [empresa]);
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
