var database = require("../database/config");

function listarFuncionarios(fk_empresa) {
  var instrucaoSql = `SELECT u.nome, u.email, c.nome AS cargo, u.stats
    FROM usuario AS u
    JOIN cargo AS c
      ON u.id_cargo = c.id_cargo
    WHERE u.id_empresa = ${Number(fk_empresa)};`

  return database.executar(instrucaoSql)
}

module.exports = {
  listarFuncionarios,
}