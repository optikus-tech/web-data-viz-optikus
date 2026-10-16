 var database = require("../database/config");


function cadastrar(nome,cpf,email,telefone,senha) {
  var instrucaoSql = `
          INSERT INTO usuario (nome, cpf, email, telefone, senha, id_empresa, id_cargo) VALUES ('${nome}', '${cpf}', '${telefone}', '${email}', '${senha}', 1, 1);`;
      console.log("Executando a instrução SQL: \n" + instrucaoSql);
      return database.executar(instrucaoSql);
}

module.exports = { 
  cadastrar 
};
