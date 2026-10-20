var empresaModel = require("../models/empresaModel");

function listarFuncionarios(req, res) {
  var fk_empresa = req.body.fk_empresa;

  if (fk_empresa == undefined) {
    return res.status(400).send("ID da empresa inválido!");
  }

  empresaModel.listarFuncionarios(fk_empresa)
    .then(function (resultado) {
      console.log(`Funcionários encontrados: ${resultado.length}`);

      res.status(200).json(resultado);
    })
    .catch(function (erro) {
      console.log("Erro ao listar funcionários:", erro.sqlMessage || erro);

      res.status(500).json(erro.sqlMessage || "Erro ao listar funcionários.");
    });
}

function cadastrar(req, res) {
  var nome = req.body.nomeServer;
  var cpf = req.body.cpfServer;
  var telefone = req.body.telefoneServer;
  var email = req.body.emailServer;
  var senha = req.body.senhaServer;


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
    empresaModel.cadastrar(nome, cpf, telefone, email, senha)
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

module.exports = {
  cadastrar,
  listarFuncionarios
};
