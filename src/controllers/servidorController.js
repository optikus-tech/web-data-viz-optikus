var net = require("net");
var servidorModel = require("../models/servidorModel");

var responsabilidadesPermitidas = [
  "Armazenamento",
  "Processamento de IA",
  "NVR",
  "Gateway de Streaming"
];

function obterEmpresa(req) {
  return typeof req.body.empresa === "string" ? req.body.empresa.trim() : "";
}

function listar(req, res) {
  var empresa = obterEmpresa(req);
  if (!empresa) return res.status(400).send("Empresa não informada.");

  servidorModel.listar(empresa)
    .then(function (servidores) {
      res.status(200).json(servidores);
    })
    .catch(function (erro) {
      console.error("Erro ao listar servidores:", erro.sqlMessage || erro);
      res.status(500).send("Erro ao listar servidores.");
    });
}

function listarLocalidades(req, res) {
  var empresa = obterEmpresa(req);
  if (!empresa) return res.status(400).send("Empresa não informada.");

  servidorModel.listarLocalidades(empresa)
    .then(function (localidades) {
      res.status(200).json(localidades);
    })
    .catch(function (erro) {
      console.error("Erro ao listar localidades:", erro.sqlMessage || erro);
      res.status(500).send("Erro ao listar localidades.");
    });
}

function validarNumeroSerie(req, res) {
  var empresa = obterEmpresa(req);
  var numeroSerie = typeof req.body.numero_serie === "string" ? req.body.numero_serie.trim() : "";
  if (!empresa || !/^[A-Za-z0-9-]{4,64}$/.test(numeroSerie)) {
    return res.status(400).send("Informe uma empresa e um número de série válido.");
  }

  servidorModel.validarNumeroSerie(numeroSerie, empresa)
    .then(function (equipamento) {
      if (!equipamento) {
        return res.status(404).send("Número de série inválido, não provisionado ou já vinculado a um servidor.");
      }
      return res.status(200).json(equipamento);
    })
    .catch(function (erro) {
      console.error("Erro ao validar número de série:", erro.sqlMessage || erro);
      res.status(500).send("Erro ao validar o número de série.");
    });
}

function cadastrar(req, res) {
  var empresa = obterEmpresa(req);
  var dados = {
    empresa: empresa,
    numeroSerie: typeof req.body.numero_serie === "string" ? req.body.numero_serie.trim() : "",
    hostname: typeof req.body.hostname === "string" ? req.body.hostname.trim() : "",
    ip: typeof req.body.ip === "string" ? req.body.ip.trim() : "",
    sistemaOperacional: typeof req.body.sistema_operacional === "string" ? req.body.sistema_operacional.trim() : "",
    versaoSo: typeof req.body.versao_so === "string" ? req.body.versao_so.trim() : "",
    responsabilidade: typeof req.body.responsabilidade === "string" ? req.body.responsabilidade.trim() : "",
    idLocal: Number(req.body.id_local)
  };

  if (!dados.empresa || !/^[A-Za-z0-9-]{4,64}$/.test(dados.numeroSerie)) {
    return res.status(400).send("Valide um número de série provisionado antes de cadastrar o servidor.");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9.-]{0,98}$/.test(dados.hostname)) {
    return res.status(400).send("Informe um hostname válido.");
  }
  if (!net.isIP(dados.ip)) return res.status(400).send("Informe um endereço IP válido.");
  if (!dados.sistemaOperacional || dados.sistemaOperacional.length > 80) {
    return res.status(400).send("Informe um sistema operacional com até 80 caracteres.");
  }
  if (!dados.versaoSo || dados.versaoSo.length > 50) {
    return res.status(400).send("Informe uma versão do sistema operacional com até 50 caracteres.");
  }
  if (!responsabilidadesPermitidas.includes(dados.responsabilidade)) {
    return res.status(400).send("Selecione uma responsabilidade válida.");
  }
  if (!Number.isInteger(dados.idLocal) || dados.idLocal <= 0) {
    return res.status(400).send("Selecione uma unidade/local válido.");
  }

  servidorModel.cadastrar(dados)
    .then(function (resultado) {
      if (resultado.affectedRows === 0) {
        return res.status(409).send("O número de série ou a unidade/local não está mais disponível para cadastro.");
      }
      return res.status(201).json({ mensagem: "Servidor cadastrado com sucesso." });
    })
    .catch(function (erro) {
      console.error("Erro ao cadastrar servidor:", erro.sqlMessage || erro);
      if (erro.code === "ER_DUP_ENTRY") {
        return res.status(409).send("Esse número de série já está cadastrado.");
      }
      return res.status(500).send("Erro ao cadastrar servidor.");
    });
}

function deletar(req, res) {
  var empresa = obterEmpresa(req);
  var id = Number(req.body.id);
  if (!empresa) return res.status(400).send("Empresa não informada.");
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).send("Informe um servidor válido para excluir.");
  }

  servidorModel.deletar(id, empresa)
    .then(function (resultado) {
      if (resultado.affectedRows === 0) {
        return res.status(404).send("Servidor não encontrado nesta empresa.");
      }
      return res.status(200).json({ mensagem: "Servidor excluído com sucesso." });
    })
    .catch(function (erro) {
      console.error("Erro ao excluir servidor:", erro.sqlMessage || erro);
      return res.status(500).send("Erro ao excluir servidor.");
    });
}

module.exports = {
  listar,
  listarLocalidades,
  validarNumeroSerie,
  cadastrar,
  deletar
};
