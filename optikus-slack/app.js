
require("dotenv").config();

const { App } = require("@slack/bolt");

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
});

// Dados temporários do incidente de teste
const incidentes = new Map();

const idIncidente = "001";

function mensagemGestor(incidente) {
    return [
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
                    `*Incidente:* #${incidente.id}\n` +
                    `*Área:* Setor Norte\n` +
                    `*Problema:* Falha de rede\n` +
                    `*Duração:* 12 minutos\n` +
                    `*Gestor:* ${incidente.gestor
                        ? `<@${incidente.gestor}>`
                        : "Aguardando responsável"}`
            }
        },
        ...(!incidente.gestor ? [{
            type: "actions",
            elements: [{
                type: "button",
                text: {
                    type: "plain_text",
                    text: "Assumir incidente"
                },
                style: "primary",
                action_id: "assumir_incidente",
                value: incidente.id
            }]
        }] : [])
    ];
}

function mensagemAnalista(incidente) {
    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "🔎 Atendimento — Optikus"
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text:
                    `*Incidente:* #${incidente.id}\n` +
                    `*Problema:* Falha de rede — Setor Norte\n` +
                    `*Gestor:* <@${incidente.gestor}>\n` +
                    `*Analista:* ${incidente.analista
                        ? `<@${incidente.analista}>`
                        : "Aguardando responsável"}\n` +
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

// Gestor assume o incidente
app.action("assumir_incidente", async ({ ack, body, client }) => {
    await ack();

    const id = body.actions[0].value;
    const incidente = incidentes.get(id);

    if (!incidente || incidente.gestor) return;

    incidente.gestor = body.user.id;

    try {
        // Atualiza a mensagem dos gestores
        await client.chat.update({
            channel: body.channel.id,
            ts: body.message.ts,
            text: "Incidente assumido por um gestor",
            blocks: mensagemGestor(incidente)
        });

        // Encaminha para os analistas
        const resposta = await client.chat.postMessage({
            channel: process.env.SLACK_CANAL_ANALISTAS,
            text: "Novo incidente para análise",
            blocks: mensagemAnalista(incidente)
        });

        incidente.canalAnalista = resposta.channel;
        incidente.tsAnalista = resposta.ts;

        console.log("Gestor responsável:", incidente.gestor);
    } catch (erro) {
        console.error("Erro ao encaminhar incidente:", erro);
    }
});

// Analista assume o atendimento
app.action("assumir_analise", async ({ ack, body, client }) => {
    await ack();

    const id = body.actions[0].value;
    const incidente = incidentes.get(id);

    if (!incidente || incidente.analista) return;

    incidente.analista = body.user.id;

    await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        text: "Incidente em análise",
        blocks: mensagemAnalista(incidente)
    });

    console.log("Analista responsável:", incidente.analista);
});

// Analista registra o resultado
async function registrarResultado({ ack, body, client }, resultado) {
    await ack();

    const id = body.actions[0].value;
    const incidente = incidentes.get(id);

    if (!incidente || !incidente.analista ||
        incidente.resultado) return;

    // Apenas o analista responsável pode finalizar
    if (body.user.id !== incidente.analista) return;

    incidente.resultado = resultado;

    await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        text: `Incidente #${id}: ${resultado}`,
        blocks: mensagemAnalista(incidente)
    });

    console.log("Resultado registrado:", resultado);
    console.log("Gestor:", incidente.gestor);
    console.log("Analista:", incidente.analista);
}

app.action("resultado_resolvido", async (args) => {
    await registrarResultado(args, "Resolvido");
});

app.action("resultado_pendente", async (args) => {
    await registrarResultado(args, "Não resolvido");
});

// Inicialização
(async () => {
    try {
        await app.start();
        console.log("Optikus Bot conectado ao Slack!");

        const incidente = {
            id: idIncidente,
            gestor: null,
            analista: null,
            resultado: null
        };

        incidentes.set(idIncidente, incidente);

        await app.client.chat.postMessage({
            channel: process.env.SLACK_CANAL_GESTORES,
            text: "Novo incidente detectado pela Optikus",
            blocks: mensagemGestor(incidente)
        });

        console.log("Formulário enviado para #gestores!");
    } catch (erro) {
        console.error("Erro ao iniciar Optikus Bot:", erro);
    }
})();
