var empresaModel = require("../models/empresaModel");



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
  cadastrar
};
