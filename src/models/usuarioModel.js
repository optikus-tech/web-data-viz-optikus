var database = require("../database/config")

function login(email, senha) {
    var instrucao = `
    SELECT u.id as id_usuario, e.razao_social as empresa, c.nome as cargo, u.nome, email 
    from usuario u 
    join cargo c on c.id = u.id_cargo
    join empresa e on e.id = u.id_empresa
    where email = '${email}' and senha = '${senha}';
    `;
    console.log("Executando a instrução SQL: \n" +
        instrucao);
    return database.executar(instrucao);
}

// Coloque os mesmos parâmetros aqui. Vá para a var instrucaoSql
function cadastrar(nome, cpf, telefone ,email, senha) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function cadastrar():", nome, cpf, telefone, email, senha);
    
    // Insira exatamente a query do banco aqui, lembrando da nomenclatura exata nos valores
    //  e na ordem de inserção dos dados.
   var instrucaoSql = `
        INSERT INTO usuario (nome, cpf, telefone, email, senha, id_empresa, id_cargo) VALUES ('${nome}', '${cpf}', '${telefone}', '${email}', '${senha}', 1, 1);`;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function atualizar(nome, cpf, email, telefone, senha, stats, id_usuario) {
    var instrucaoSql = `Update usuario set nome = ? and cpf = ? and email = ? and telefone = ? and senha = ? and stats = ? where id_usuario = ?`
    return database.executar(instrucaoSql, [nome,cpf,email,telefone,senha,stats,id_usuario])
}

function atualizarUltimoAcesso(id_usuario) {
    var instrucaoSql = `
    update usuario set atualizado_em = NOW() where id = ${id_usuario};
    `
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [id_usuario])
}

module.exports = {
    login,
    cadastrar,
    atualizar,
    atualizarUltimoAcesso
};