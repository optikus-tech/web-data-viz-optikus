var database = require("../database/config");

function listarFuncionarios(fk_empresa) {
  var instrucaoSql = `SELECT u.id as id_usuario, u.nome, u.email, c.nome AS cargo, u.stats, u.atualizado_em as acesso
    FROM usuario AS u
    JOIN cargo AS c
      ON u.id_cargo = c.id
    WHERE u.id_empresa = (SELECT id FROM empresa WHERE razao_social = ?);`;

  console.log("Executando a instrução SQL: \n" + instrucaoSql);
  return database.executar(instrucaoSql, [fk_empresa]);
}

function cadastrar(nome, cpf, email, telefone, senha, cargo, empresa) {
  var instrucaoSql = `
    INSERT INTO usuario (nome, cpf, email, telefone, senha, id_empresa, id_cargo)
    SELECT ?, ?, ?, ?, ?, empresa.id, cargo.id
    FROM empresa
    JOIN cargo ON cargo.nome = ?
    WHERE empresa.razao_social = ?;`;

  console.log("Executando a instrução SQL: \n" + instrucaoSql);
  return database.executar(instrucaoSql, [nome, cpf, email, telefone, senha, cargo, empresa]);
}

function deletar(id_usuario) {
  var instrucaoSql = `delete from usuario where id = ?`;

  console.log("Executando a instrução SQL: \n" + instrucaoSql);
  return database.executar(instrucaoSql, [id_usuario])
}

module.exports = {
  listarFuncionarios,
  cadastrar,
  deletar,
};
