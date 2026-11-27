var lucasModel = require("../models/lucasModel");

function listar(req, res) {
  var empresa = typeof req.body.empresa === "string" ? req.body.empresa.trim() : "";
  if (!empresa) return res.status(400).send("Empresa não informada.");

  lucasModel.listarServidores(empresa)
    .then(function (servidores) {
      res.status(200).json(servidores);
    })
    .catch(function (erro) {
      console.error("Erro ao listar servidores da previsão:", erro.sqlMessage || erro);
      res.status(500).send("Erro ao listar servidores.");
    });
}

function dashboard(req, res) {
  var empresa = typeof req.body.empresa === "string" ? req.body.empresa.trim() : "";
  var idServidor = Number(req.body.id_servidor);

  if (!empresa) return res.status(400).send("Empresa não informada.");
  if (!Number.isSafeInteger(idServidor) || idServidor <= 0) {
    return res.status(400).send("Informe um servidor válido.");
  }

  lucasModel.obterDashboard(empresa, idServidor)
    .then(function (dados) {
      if (!dados.servidor) return res.status(404).json(dados);
      res.status(200).json(dados);
    })
    .catch(function (erro) {
      console.error("Erro ao consultar previsão de CPU:", erro.sqlMessage || erro);
      res.status(500).send("Erro ao consultar a previsão de CPU.");
    });
}

module.exports = { listar, dashboard };