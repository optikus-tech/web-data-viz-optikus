 var database = require("../database/config");

function listarFuncionarios(fk_empresa) {
  var instrucaoSql = `SELECT u.nome, u.email, c.nome AS cargo, u.stats, u.atualizado_em as acesso
    FROM usuario AS u
    JOIN cargo AS c
      ON u.id_cargo = c.id
    WHERE u.id_empresa = (select id from empresa where razao_social = '${fk_empresa}');`
    console.log("cheguei")

  return database.executar(instrucaoSql)
}

function cadastrar(nome,cpf,email,telefone,senha) {
  var instrucaoSql = `
          INSERT INTO usuario (nome, cpf, email, telefone, senha, id_empresa, id_cargo) VALUES ('${nome}', '${cpf}', '${telefone}', '${email}', '${senha}', 1, 1);`;
      console.log("Executando a instrução SQL: \n" + instrucaoSql);
      return database.executar(instrucaoSql);
}

module.exports = {
  listarFuncionarios, 
  cadastrar 
};
