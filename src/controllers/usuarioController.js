var usuarioModel = require("../models/usuarioModel");

function login(req, res) {
    var email = req.body.email;
    var senha = req.body.senha;
    usuarioModel.login(email,senha).then((resultado) => {

        if(resultado.length > 0) {
            var id_usuario = resultado[0].id_usuario;
            usuarioModel.atualizarUltimoAcesso(id_usuario)
            .then(() => {
                res.status(200).json(resultado[0]);
            })
            .catch((erro) => {
                console.log("erro em atualizar o ultimo acesso", erro);
                res.status(500).json(erro.sqlMessage);
            });
        } else {
            res.status(401).json({
                mensagem: "Email ou senha invalido"
            })
        }

    }).catch(function(erro){
        console.log("Erro ao realizar o login", erro)
         res.status(500).json(erro.sqlMessage);
    })
   
}

function cadastrar(req, res) {
    // Crie uma variável que vá recuperar os valores do arquivo cadastro.html
    var nome = req.body.nomeServer;
    var cpf = req.body.cpfServer;
    var telefone = req.body.telefoneServer;
    var email = req.body.emailServer;
    var senha = req.body.senhaServer;

    /* var fkEmpresa = req.body.idEmpresaVincularServer; */

    // Faça as validações dos valores
    if (nome == undefined) {
        res.status(400).send("Seu nome está undefined!");
    } else if (cpf == undefined) {
        res.status(400).send("Seu cpf está undefined!");
    } else if (telefone == undefined) {
        res.status(400).send("Seu telefone está undefined!");
    } else if (email == undefined) {
        res.status(400).send("Seu email está undefined!");
    } else if (senha == undefined) {
        res.status(400).send("Sua senha está undefined!");
    } else {

        // Passe os valores como parâmetro e vá para o arquivo usuarioModel.js
        usuarioModel.cadastrar(nome, cpf, telefone ,email, senha)
            .then(
                function (resultado) {
                    res.json(resultado);
                }
            ).catch(
                function (erro) {
                    console.log(erro);
                    console.log(
                        "\nHouve um erro ao realizar o cadastro! Erro: ",
                        erro.sqlMessage
                    );
                    res.status(500).json(erro.sqlMessage);
                }
            );
    }
}

function redefinirSenha(req,res) {
    var id_usuario = req.body.id_usuarioServer;
    var senha_atual = req.body.senha_atualServer;
    var nova_senha = req.body.nova_senhaServer;

    console.log("ID:", id_usuario);
    console.log("Senha Atual:", senha_atual);
    console.log("Nova Senha:", nova_senha);

    if(id_usuario == undefined || senha_atual == undefined || nova_senha == undefined) {
       res.status(400).send(`Valores inválidos - ID: ${id_usuario}, Senha Atual: ${senha_atual}, Nova Senha: ${nova_senha}`);

    } else {
        usuarioModel.redefinirSenha(id_usuario, senha_atual, nova_senha)
            .then(function(resultado) {
                if(resultado.affectedRows > 0) {
                    res.status(200).json({ mensagem: "Senha atualizada!"})
                } else {
                    res.status(403).json({ mensagem: "A senha atual esta incorreta"})

                }
            })
            .catch(function(erro) {
                console.log(erro);
                console.log("Erro ao redefinir a senha", erro.sqlMessage)
                res.status(500).json(erro.sqlMessage)
            });
    }
}

module.exports = {
    login,
    cadastrar,
    redefinirSenha
}