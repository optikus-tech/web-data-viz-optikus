var mysql = require("mysql2");

// CONEXÃO DO BANCO MYSQL SERVER
var mySqlConfig = {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
};

function executar(instrucao, parametros) {

    if (process.env.AMBIENTE_PROCESSO !== "producao" && process.env.AMBIENTE_PROCESSO !== "desenvolvimento") {
        console.log("\nO AMBIENTE (produção OU desenvolvimento) NÃO FOI DEFINIDO EM .env OU dev.env OU app.js\n");
        return Promise.reject("AMBIENTE NÃO CONFIGURADO EM .env");
    }

    return new Promise(function (resolve, reject) {
        var conexao = mysql.createConnection(mySqlConfig);
        conexao.connect();
        conexao.query(instrucao, parametros || [], function (erro, resultados) {
            conexao.end();
            if (erro) {
                reject(erro);
            }
            console.log(resultados);
            resolve(resultados);
        });
        conexao.on('error', function (erro) {
            return ("ERRO NO MySQL SERVER: ", erro.sqlMessage);
        });
    });
}

function executarTransacao(callback) {
    if (process.env.AMBIENTE_PROCESSO !== "producao" && process.env.AMBIENTE_PROCESSO !== "desenvolvimento") {
        return Promise.reject(new Error("AMBIENTE NÃO CONFIGURADO EM .env"));
    }

    var conexao = mysql.createConnection(mySqlConfig).promise();
    var transacaoIniciada = false;

    return conexao.beginTransaction()
        .then(function () {
            transacaoIniciada = true;
            return callback({
                executar: function (instrucao, parametros) {
                    return conexao.query(instrucao, parametros || [])
                        .then(function (resultado) {
                            return resultado[0];
                        });
                }
            });
        })
        .then(function (resultado) {
            return conexao.commit().then(function () {
                return resultado;
            });
        })
        .catch(function (erro) {
            if (!transacaoIniciada) return Promise.reject(erro);
            return conexao.rollback().then(
                function () {
                    return Promise.reject(erro);
                },
                function (erroRollback) {
                    erro.rollbackError = erroRollback;
                    return Promise.reject(erro);
                }
            );
        })
        .finally(function () {
            return conexao.end();
        });
}

module.exports = {
    executar,
    executarTransacao
};