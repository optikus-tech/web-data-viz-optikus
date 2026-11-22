
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
    path: path.join(__dirname, "..", ".env.dev")
});

dotenv.config({
    path: path.join(__dirname, ".env"),
    override: true
});

process.env.AMBIENTE_PROCESSO = "desenvolvimento";

const { App } = require("@slack/bolt");
const { iniciarMonitoramento } = require("./monitorarAlertas");

const EMPRESA = process.env.OPTIKUS_EMPRESA;
const CANAL_GESTORES = process.env.SLACK_CANAL_GESTORES;
const CANAL_ANALISTAS = process.env.SLACK_CANAL_ANALISTAS;
const CANAL_EM_ANDAMENTO = process.env.SLACK_CANAL_INCIDENTES_EM_ANDAMENTO;
const CANAL_SOLUCIONADO = process.env.SLACK_CANAL_INCIDENTES_SOLUCIONADOS;
const CANAL_NAO_SOLUCIONADO = process.env.SLACK_CANAL_INCIDENTES_NAO_SOLUCIONADOS;

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
});

const incidentes = new Map();

function escaparSlack(valor) {
    return String(valor ?? "Não informado")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function formatarData(valor) {
    if (!valor) return "Não informado";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return escaparSlack(valor);
    }

    return data.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo"
    });
}

function descricaoIncidente(incidente) {
    const valor = incidente.valor == null
        ? "Não informado"
        : `${incidente.valor}${incidente.unidade || ""}`;

    return (
        `*Empresa:* ${escaparSlack(incidente.empresa)}\n` +
        `*Servidor:* ${escaparSlack(incidente.servidor)}\n` +
        `*Componente:* ${escaparSlack(incidente.componente)}\n` +
        `*Criticidade:* ${escaparSlack(incidente.criticidade)}\n` +
        `*Valor:* ${escaparSlack(valor)}\n` +
        `*Detectado em:* ${formatarData(incidente.inicioAlerta)}\n` +
        `*Duração ao notificar:* ${incidente.duracaoSegundos} segundos`
    );
}


function situacaoIncidente(incidente) {
    if (incidente.resultado) return incidente.resultado;
    if (incidente.analista) return "Em andamento";
    if (incidente.gestor) return "Aguardando analista";
    return "Aguardando gestor";
}

async function atualizarMensagensIncidente(client, incidente) {
    const atualizacoes = [];

    if (incidente.canalGestor && incidente.tsGestor) {
        atualizacoes.push(
            client.chat.update({
                channel: incidente.canalGestor,
                ts: incidente.tsGestor,
                text: `Incidente: ${situacaoIncidente(incidente)}`,
                blocks: mensagemGestor(incidente)
            })
        );
    }

    if (incidente.canalAnalista && incidente.tsAnalista) {
        atualizacoes.push(
            client.chat.update({
                channel: incidente.canalAnalista,
                ts: incidente.tsAnalista,
                text: `Incidente: ${situacaoIncidente(incidente)}`,
                blocks: mensagemAnalista(incidente)
            })
        );
    }

    const resultados = await Promise.allSettled(atualizacoes);

    for (const resultado of resultados) {
        if (resultado.status === "rejected") {
            console.error(
                "[SLACK] Erro ao atualizar mensagem:",
                resultado.reason
            );
        }
    }
}



function mensagemGestor(incidente) {
    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "🚨 Novo incidente — Optikus"
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text:
                    descricaoIncidente(incidente) +
                    `\n*Gestor:* ${
                        incidente.gestor
                            ? `<@${incidente.gestor}>`
                            : "Aguardando responsável"
                    }` +
                    `\n*Analista:* ${
                        incidente.analista
                            ? `<@${incidente.analista}>`
                            : "Aguardando responsável"
                    }` +
                    `\n*Situação:* ${situacaoIncidente(incidente)}`
            }
        }
    ];

    if (!incidente.gestor) {
        blocks.push({
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Assumir incidente"
                    },
                    style: "primary",
                    action_id: "assumir_incidente",
                    value: String(incidente.id)
                }
            ]
        });
    }

    return blocks;
}


function mensagemAnalista(incidente) {
    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "Atendimento — Optikus"
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text:
                    descricaoIncidente(incidente) +
                    `\n*Gestor:* <@${incidente.gestor}>\n` +
                    `*Analista:* ${incidente.analista
                        ? `<@${incidente.analista}>`
                        : "Aguardando responsável"
                    }\n` +
                    `*Situação:* ${incidente.resultado || "Pendente"}`
            }
        }
    ];

    if (!incidente.analista) {
        blocks.push({
            type: "actions",
            elements: [{
                type: "button",
                text: {
                    type: "plain_text",
                    text: "Assumir análise"
                },
                style: "primary",
                action_id: "assumir_analise",
                value: incidente.id
            }]
        });
    } else if (!incidente.resultado) {
        blocks.push({
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Problema resolvido"
                    },
                    style: "primary",
                    action_id: "resultado_resolvido",
                    value: incidente.id
                },
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Não resolvido"
                    },
                    action_id: "resultado_pendente",
                    value: incidente.id
                }
            ]
        });
    }

    return blocks;
}

async function enviarIncidenteSlack(dados) {
    if (incidentes.has(dados.id)) return;

    const incidente = {
        ...dados,
        gestor: null,
        analista: null,
        resultado: null,
        encaminhando: false,
        assumindoAnalise: false,
        finalizando: false
    };

    const resposta = await app.client.chat.postMessage({
        channel: CANAL_GESTORES,
        text: `Alerta ${dados.criticidade}: ${dados.servidor} - ${dados.componente}`,
        blocks: mensagemGestor(incidente)
    });

    incidente.canalGestor = resposta.channel;
    incidente.tsGestor = resposta.ts;

    incidentes.set(incidente.id, incidente);

    console.log(
        `[SLACK] Incidente enviado: ${dados.servidor} - ${dados.componente}`
    );
}

app.action("assumir_incidente", async ({ ack, body, client }) => {
    await ack();

    const id = body.actions[0].value;
    const incidente = incidentes.get(id);

    if (!incidente || incidente.gestor || incidente.encaminhando) {
        return;
    }

    incidente.encaminhando = true;
    incidente.gestor = body.user.id;

    try {
        const resposta = await client.chat.postMessage({
            channel: CANAL_ANALISTAS,
            text: `Novo incidente para análise: ${incidente.servidor}`,
            blocks: mensagemAnalista(incidente)
        });

        incidente.canalAnalista = resposta.channel;
        incidente.tsAnalista = resposta.ts;

        await client.chat.update({
            channel: incidente.canalGestor,
            ts: incidente.tsGestor,
            text: "Incidente assumido por um gestor",
            blocks: mensagemGestor(incidente)
        });

        console.log("[SLACK] Gestor:", incidente.gestor);
    } catch (erro) {
        console.error("[SLACK] Erro ao encaminhar:", erro);

        if (!incidente.tsAnalista) {
            incidente.gestor = null;
        }
    } finally {
        incidente.encaminhando = false;
    }
});


app.action("assumir_analise", async ({ ack, body, client }) => {
    await ack();

    const id = body.actions[0].value;
    const incidente = incidentes.get(id);

    if (
        !incidente ||
        incidente.analista ||
        incidente.assumindoAnalise
    ) return;

    incidente.assumindoAnalise = true;
    incidente.analista = body.user.id;

    try {
        const resposta = await client.chat.postMessage({
            channel: CANAL_EM_ANDAMENTO,
            text: `Atendimento iniciado: ${incidente.servidor}`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "Incidente em andamento"
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text:
                            descricaoIncidente(incidente) +
                            `\n*Gestor:* <@${incidente.gestor}>` +
                            `\n*Analista:* <@${incidente.analista}>` +
                            `\n*Situação:* Em andamento`
                    }
                }
            ]
        });

        incidente.canalAndamento = resposta.channel;
        incidente.tsAndamento = resposta.ts;

        await atualizarMensagensIncidente(client, incidente);

        console.log(
            `[SLACK] Atendimento iniciado por ${incidente.analista}`
        );

    } catch (erro) {
        if (!incidente.tsAndamento) {
            incidente.analista = null;
        }

        console.error(
            "[SLACK] Erro ao iniciar atendimento:",
            erro
        );
    } finally {
        incidente.assumindoAnalise = false;
    }
});




async function registrarResultado({ ack, body, client }, resultado) {
    await ack();

    const id = body.actions[0].value;
    const incidente = incidentes.get(id);

    if (
        !incidente ||
        !incidente.analista ||
        incidente.resultado ||
        incidente.finalizando
    ) return;

    if (body.user.id !== incidente.analista) return;

    incidente.finalizando = true;

    const canalDestino =
        resultado === "Resolvido"
            ? CANAL_SOLUCIONADO
            : CANAL_NAO_SOLUCIONADO;

    const titulo =
        resultado === "Resolvido"
            ? "Incidente solucionado"
            : "Incidente não solucionado";

    try {
        const resposta = await client.chat.postMessage({
            channel: canalDestino,
            text: `${titulo}: ${incidente.servidor}`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: titulo
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text:
                            descricaoIncidente(incidente) +
                            `\n*Gestor:* <@${incidente.gestor}>` +
                            `\n*Analista:* <@${incidente.analista}>` +
                            `\n*Resultado:* ${resultado}` +
                            `\n*Finalizado em:* ${formatarData(new Date())}`
                    }
                }
            ]
        });

        incidente.canalResultado = resposta.channel;
        incidente.tsResultado = resposta.ts;
        incidente.resultado = resultado;

        await atualizarMensagensIncidente(client, incidente);

        if (incidente.canalAndamento && incidente.tsAndamento) {
            try {
                await client.chat.update({
                    channel: incidente.canalAndamento,
                    ts: incidente.tsAndamento,
                    text: `Atendimento finalizado: ${resultado}`,
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: titulo
                            }
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text:
                                    descricaoIncidente(incidente) +
                                    `\n*Gestor:* <@${incidente.gestor}>` +
                                    `\n*Analista:* <@${incidente.analista}>` +
                                    `\n*Resultado:* ${resultado}`
                            }
                        }
                    ]
                });
            } catch (erro) {
                console.error(
                    "[SLACK] Erro ao atualizar Em andamento:",
                    erro
                );
            }
        }

        console.log(
            `[SLACK] Incidente finalizado: ${resultado}`
        );

    } catch (erro) {
        console.error(
            "[SLACK] Erro ao registrar resultado:",
            erro
        );
    } finally {
        incidente.finalizando = false;
    }
}



app.action("resultado_resolvido", async (args) => {
    await registrarResultado(args, "Resolvido");
});

app.action("resultado_pendente", async (args) => {
    await registrarResultado(args, "Não resolvido");
});

(async () => {
    try {
        if (!EMPRESA || !CANAL_GESTORES || !CANAL_ANALISTAS || !CANAL_EM_ANDAMENTO || !CANAL_SOLUCIONADO || !CANAL_NAO_SOLUCIONADO) {
            throw new Error(
                "Configure OPTIKUS_EMPRESA e os canais do Slack no .env"
            );
        }

        await app.start();

        console.log("[SLACK] Optikus Bot conectado!");
        console.log(`[SLACK] Empresa monitorada: ${EMPRESA}`);

        iniciarMonitoramento(EMPRESA, enviarIncidenteSlack);

        console.log("[MONITOR] Monitoramento iniciado!");
    } catch (erro) {
        console.error("[SLACK] Erro na inicialização:", erro);
        process.exitCode = 1;
    }
})();
