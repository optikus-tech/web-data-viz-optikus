var database = require("../database/config")

function login(email, senha) {
    var instrucao = `
    SELECT id_empresa, id_cargo, nome, email from usuario where email = '${email}' and senha = '${senha}';
    `;
    console.log("Executando a instrução SQL: \n" +
        instrucao);
    return database.executar(instrucao);
}

module.exports = {
    login
};

