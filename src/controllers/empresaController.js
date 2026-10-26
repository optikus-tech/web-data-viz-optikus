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
  var nome = typeof req.body.nomeServer === "string" ? req.body.nomeServer.trim() : "";
  var cpf = typeof req.body.cpfServer === "string" ? req.body.cpfServer.replace(/\D/g, "") : "";
  var telefone = typeof req.body.telefoneServer === "string" && req.body.telefoneServer.trim()
    ? req.body.telefoneServer.trim()
    : null;
  var email = typeof req.body.emailServer === "string" ? req.body.emailServer.trim() : "";
  var senha = typeof req.body.senhaServer === "string" ? req.body.senhaServer : "";
  var cargo = typeof req.body.cargoServer === "string" ? req.body.cargoServer : "";
  var empresa = typeof req.body.empresaServer === "string" ? req.body.empresaServer.trim() : "";

  if (!nome || !email || !senha || !empresa || !/^\d{11}$/.test(cpf)) {
    return res.status(400).send("Preencha os campos obrigatórios e informe um CPF com 11 números.");
  }
  if (senha.length < 8) {
    return res.status(400).send("A senha deve conter pelo menos 8 caracteres.");
  }
  if (!["Gestor", "Analista"].includes(cargo)) {
    return res.status(400).send("Selecione um cargo válido.");
  }

  empresaModel.cadastrar(nome, cpf, email, telefone, senha, cargo, empresa)
    .then(function (resultado) {
      if (resultado.affectedRows === 0) {
        return res.status(400).send("Não foi possível localizar a empresa ou o cargo selecionado.");
      }
      return res.status(201).json({ mensagem: "Usuário cadastrado com sucesso." });
    })
    .catch(function (erro) {
      console.error("Erro ao cadastrar usuário:", erro.sqlMessage || erro);
      if (erro.code === "ER_DUP_ENTRY") {
        return res.status(409).send("Já existe um usuário com esse CPF ou email.");
      }
      return res.status(500).send("Erro ao cadastrar usuário.");
    });
}

function deletar(req, res) {
  var id_usuario = req.body.idServer;
  if (id_usuario <= 0 || isNaN(id_usuario) || id_usuario == undefined) {
    return res.status(400).send("O id do usuário selecionado está: ", id_usuario);
  }

  empresaModel.deletar(id_usuario)
    .then(function (resultado) {
      if (resultado.affectedRows === 0) {
        return res.status(400).send("Não foi possível localizar o usuário.");
      }
      return res.status(201).json({ mensagem: "Usuário removido com sucesso." });
    })
    .catch(function (erro) {
      console.error("Erro ao cadastrar usuário:", erro.sqlMessage || erro);
      if (erro.code === "ER_DUP_ENTRY") {
        return res.status(409).send("Usuário informado não encontrado.");
      }
      return res.status(500).send("Erro ao deletar usuário.");
    });
}

module.exports = {
  cadastrar,
  listarFuncionarios,
  deletar,
};
