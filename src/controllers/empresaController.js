var empresaModel = require("../models/empresaModel");

function listarFuncionarios(req, res) {
    var fk_empresa = req.body.fk_empresa;

    if (fk_empresa == undefined || !Number.isInteger(Number(fk_empresa)) || Number(fk_empresa) <= 0) {
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

module.exports = {
    listarFuncionarios
};
