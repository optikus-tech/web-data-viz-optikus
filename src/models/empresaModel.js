var database = require("../database/config");

function listarFuncionarios(fk_empresa) {
  var instrucaoSql = `SELECT u.id as id_usuario, u.nome, u.email, c.nome AS cargo, u.status AS stats, u.atualizado_em as acesso
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
    JOIN cargo ON cargo.nome = ? AND cargo.EmpresaId = empresa.id
    WHERE empresa.razao_social = ?;`;

  console.log("Executando a instrução SQL: \n" + instrucaoSql);
  return database.executar(instrucaoSql, [nome, cpf, email, telefone, senha, cargo, empresa]);
}

function atualizar(id_usuario, nome, email, cargo, status, empresa) {
  var instrucaoSql = `
    UPDATE usuario AS u
    JOIN empresa AS e ON e.id = u.id_empresa
    JOIN cargo AS c ON c.nome = ? AND c.EmpresaId = u.id_empresa
    SET u.nome = ?, u.email = ?, u.id_cargo = c.id, u.status = ?
    WHERE u.id = ? AND e.razao_social = ?;`;

  console.log("Executando a instrução SQL: \n" + instrucaoSql);
  return database.executar(instrucaoSql, [cargo, nome, email, status, id_usuario, empresa])
    .then(function (resultado) {
      if (resultado.affectedRows > 0) {
        return { atualizado: true };
      }

      var verificacaoSql = `
        SELECT c.id AS id_cargo
        FROM usuario AS u
        JOIN empresa AS e ON e.id = u.id_empresa
        LEFT JOIN cargo AS c ON c.nome = ? AND c.EmpresaId = u.id_empresa
        WHERE u.id = ? AND e.razao_social = ?;`;

      return database.executar(verificacaoSql, [cargo, id_usuario, empresa])
        .then(function (usuarios) {
          if (usuarios.length === 0) return { usuarioEncontrado: false };
          if (usuarios[0].id_cargo === null) return { cargoEncontrado: false };
          return { atualizado: false };
        });
    });
}

function deletar(id_usuario) {
  var instrucaoSql = `delete from usuario where id = ?`;

  console.log("Executando a instrução SQL: \n" + instrucaoSql);
  return database.executar(instrucaoSql, [id_usuario])
}

module.exports = {
  listarFuncionarios,
  cadastrar,
  atualizar,
  deletar,
};
