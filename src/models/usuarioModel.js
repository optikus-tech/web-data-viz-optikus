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

function atualizar(nome, cpf, email, telefone, senha, stats, id_usuario) {
    var instrucaoSql = `Update usuario set nome = ? and cpf = ? and email = ? and telefone = ? and senha = ? and stats = ? where id_usuario = ?`
    return database.executar(instrucaoSql, [nome,cpf,email,telefone,senha,stats,id_usuario])
}

function atualizarUltimoAcesso(id_usuario) {
    var instrucaoSql = `
    update usuario set atualizado_em = NOW() where id = ?;`
    
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [id_usuario])
}

module.exports = {
    login,
    atualizar,
    atualizarUltimoAcesso
};