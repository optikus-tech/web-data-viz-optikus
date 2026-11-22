
const servidorModel = require("../src/models/servidorModel");

const alertasMonitorados = new Map();

const TEMPO_ALERTA = 10_000;
const INTERVALO_CONSULTA = 1_000;
const MAX_IDADE_CAPTURA = 60_000;

function converterData(valor) {
    if (!valor) return null;

    const data = valor instanceof Date
        ? valor
        : new Date(String(valor).replace(" ", "T"));

    return Number.isNaN(data.getTime()) ? null : data;
}

function iniciarMonitoramento(empresa, enviarIncidenteSlack) {
    if (!empresa || typeof enviarIncidenteSlack !== "function") {
        throw new Error("Configuração inválida do monitor.");
    }

    let consultando = false;

    async function verificarAlertas() {
        if (consultando) return;

        consultando = true;

        try {
            const dados = await servidorModel.obterDadosDashboard(
                empresa,
                null,
                null
            );

            const agora = Date.now();
            const ativos = new Set();

            for (const servidor of dados.servidores || []) {
                for (const metrica of servidor.metricas || []) {

                    const chave =
                        `${empresa}:${servidor.id}:${metrica.id}`;

                    const emAlerta =
                        metrica.status_alerta === "ABERTO" &&
                        ["ALTO", "CRITICO"].includes(
                            metrica.criticidade
                        );

                    const dataCaptura = converterData(
                        metrica.criado_em
                    );

                    const timestamp = dataCaptura
                        ? dataCaptura.getTime()
                        : null;

                    const idadeCaptura = timestamp === null
                        ? Infinity
                        : agora - timestamp;

                    const capturaRecente =
                        idadeCaptura >= 0 &&
                        idadeCaptura <= MAX_IDADE_CAPTURA;

                    if (!emAlerta || !capturaRecente) {
                        if (alertasMonitorados.has(chave)) {
                            console.log(
                                `[MONITOR] Observação encerrada: ${chave}`
                            );
                        }

                        alertasMonitorados.delete(chave);
                        continue;
                    }

                    ativos.add(chave);

                    let alerta = alertasMonitorados.get(chave);

                    if (!alerta) {
                        alerta = {
                            inicioObservacao: agora,
                            primeiraCaptura: timestamp,
                            ultimaCaptura: timestamp,
                            ultimaAtualizacao: agora,
                            enviado: false,
                            enviando: false
                        };

                        alertasMonitorados.set(chave, alerta);

                        console.log(
                            `[MONITOR] Iniciando contagem: ` +
                            `${servidor.hostname} - ${metrica.nome}`
                        );

                        continue;
                    }
                    if (timestamp === alerta.ultimaCaptura) {
                        continue;
                    }
                    if (timestamp < alerta.ultimaCaptura) {
                        continue;
                    }

                    alerta.ultimaCaptura = timestamp;
                    alerta.ultimaAtualizacao = agora;

                    const tempoObservado =
                        agora - alerta.inicioObservacao;

                    const tempoEntreCapturas =
                        timestamp - alerta.primeiraCaptura;

                    console.log(
                        `[MONITOR] Nova captura: ` +
                        `${servidor.hostname} - ${metrica.nome} | ` +
                        `Observação: ${Math.floor(tempoObservado / 1000)}s`
                    );
                    if (
                        tempoObservado < TEMPO_ALERTA ||
                        tempoEntreCapturas < TEMPO_ALERTA ||
                        alerta.enviado ||
                        alerta.enviando
                    ) {
                        continue;
                    }

                    alerta.enviando = true;

                    try {
                        await enviarIncidenteSlack({
                            id: `${chave}:${alerta.inicioObservacao}`,
                            empresa,
                            servidor: servidor.hostname,
                            componente: metrica.nome,
                            valor: metrica.valor,
                            unidade: metrica.unidade_medida,
                            criticidade: metrica.criticidade,
                            inicioAlerta: new Date(
                                alerta.inicioObservacao
                            ).toISOString(),
                            horarioCaptura: metrica.criado_em,
                            duracaoSegundos: Math.floor(
                                tempoObservado / 1000
                            )
                        });

                        alerta.enviado = true;

                        console.log(
                            `[MONITOR] Incidente enviado ao Slack: ${chave}`
                        );
                    } catch (erro) {
                        console.error(
                            `[MONITOR] Erro ao enviar ${chave}:`,
                            erro
                        );
                    } finally {
                        alerta.enviando = false;
                    }
                }
            }
            for (const chave of alertasMonitorados.keys()) {
                if (!ativos.has(chave)) {
                    alertasMonitorados.delete(chave);
                }
            }

        } catch (erro) {
            console.error(
                "[MONITOR] Erro ao consultar servidores:",
                erro
            );
        } finally {
            consultando = false;
        }
    }

    console.log(
        `[MONITOR] Monitoramento iniciado: ${empresa}`
    );

    verificarAlertas();

    return setInterval(
        verificarAlertas,
        INTERVALO_CONSULTA
    );
}

module.exports = { iniciarMonitoramento };
