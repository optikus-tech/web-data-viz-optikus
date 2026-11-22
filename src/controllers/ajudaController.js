var ajudaModel = require("../models/ajudaModel");

function obterEmpresa(req) {
  return typeof req.body.empresa === "string" ? req.body.empresa.trim() : "";
}

function listarServidores(req, res) {
  var empresa = obterEmpresa(req);
  if (!empresa) return res.status(400).send("Empresa não informada.");

  ajudaModel.listarServidores(empresa)
    .then(function (servidores) {
      return res.status(200).json(servidores);
    })
    .catch(function (erro) {
      console.error("Erro ao listar servidores da ajuda:", erro.sqlMessage || erro);
      return res.status(500).send("Erro ao listar os servidores.");
    });
}

function obterLimites(req, res) {
  var empresa = obterEmpresa(req);
  var idServidor = Number(req.body.id_servidor);
  if (!empresa) return res.status(400).send("Empresa não informada.");
  if (!Number.isSafeInteger(idServidor) || idServidor <= 0) {
    return res.status(400).send("Informe um servidor válido.");
  }

  ajudaModel.obterLimites(empresa, idServidor)
    .then(function (dados) {
      if (!dados) return res.status(404).send("Servidor não encontrado nesta empresa.");
      return res.status(200).json(dados);
    })
    .catch(function (erro) {
      console.error("Erro ao consultar faixas da ajuda:", erro.sqlMessage || erro);
      return res.status(500).send("Erro ao consultar as faixas do servidor.");
    });
}

module.exports = {
  listarServidores: listarServidores,
  obterLimites: obterLimites
};