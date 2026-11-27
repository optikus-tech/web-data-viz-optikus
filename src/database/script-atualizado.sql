DROP DATABASE IF EXISTS optikus;
CREATE DATABASE IF NOT EXISTS optikus;
USE optikus;

-- 1. Localidade
CREATE TABLE IF NOT EXISTS localidade (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cep CHAR(8),
    logradouro VARCHAR(150) NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    complemento VARCHAR(100),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Empresa
CREATE TABLE IF NOT EXISTS empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    razao_social VARCHAR(150) NOT NULL UNIQUE,
    cnpj CHAR(14) NOT NULL UNIQUE,
    status ENUM('ATIVA', 'INATIVA') DEFAULT 'ATIVA',
    localidadeId INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (localidadeId) REFERENCES localidade(id)
);

-- 3. Equipamento (base de pré-autorização para validar MAC Address e Nº de Série)
CREATE TABLE IF NOT EXISTS equipamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_serie VARCHAR(64) NOT NULL UNIQUE,
    mac_address VARCHAR(17) NOT NULL UNIQUE,
    id_empresa INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresa(id) ON DELETE CASCADE
);

-- 4. Tipo de Componente
CREATE TABLE IF NOT EXISTS tipo_componente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Cargo
CREATE TABLE IF NOT EXISTS cargo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(80) NOT NULL,
    descricao VARCHAR(255),
    nivel_acesso INT,
    EmpresaId INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (EmpresaId) REFERENCES empresa(id) ON DELETE CASCADE
);

-- 6. Servidor (sem colunas repetidas; herda MAC, Serial e Empresa via id_equipamento)
CREATE TABLE IF NOT EXISTS servidor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_equipamento INT NOT NULL UNIQUE,
    hostname VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    sistema_operacional VARCHAR(80),
    versao_so VARCHAR(50),
    responsabilidade VARCHAR(80) NOT NULL DEFAULT 'Não informada',
    status ENUM('ONLINE', 'OFFLINE', 'MANUTENCAO') DEFAULT 'ONLINE',
    ultima_comunicacao DATETIME,
    id_local INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_equipamento) REFERENCES equipamento(id) ON DELETE CASCADE,
    FOREIGN KEY (id_local) REFERENCES localidade(id) ON DELETE CASCADE
);

-- 7. Usuário
CREATE TABLE IF NOT EXISTS usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    cpf CHAR(11) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    senha VARCHAR(255) NOT NULL,
    status ENUM('ATIVO', 'INATIVO') DEFAULT 'ATIVO',
    id_empresa INT NOT NULL,
    id_cargo INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresa(id) ON DELETE CASCADE,
    FOREIGN KEY (id_cargo) REFERENCES cargo(id)
);

-- 8. Componente
CREATE TABLE IF NOT EXISTS componente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    fabricante VARCHAR(80),
    modelo VARCHAR(80),
    capacidade DECIMAL(10,2),
    unidade_medida VARCHAR(10),
    status ENUM('ATIVO', 'INATIVO') DEFAULT 'ATIVO',
    id_servidor INT NOT NULL,
    id_tipo INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_servidor) REFERENCES servidor(id) ON DELETE CASCADE,
    FOREIGN KEY (id_tipo) REFERENCES tipo_componente(id)
);

-- 9. Alerta
CREATE TABLE IF NOT EXISTS alerta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nivel ENUM('BAIXO', 'MEDIO', 'ALTO', 'CRITICO') NOT NULL,
    status ENUM('ABERTO', 'RESOLVIDO') DEFAULT 'ABERTO',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 10. Parâmetro de Limite
CREATE TABLE IF NOT EXISTS parametro_limite (
    id INT AUTO_INCREMENT PRIMARY KEY,
    valor_minimo DECIMAL(10,2) NOT NULL,
    valor_maximo DECIMAL(10,2) NOT NULL,
    criticidade ENUM('BAIXO', 'MEDIO', 'ALTO', 'CRITICO'),
    id_componente INT NOT NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    alertaId INT NOT NULL,
    FOREIGN KEY (id_componente) REFERENCES componente(id) ON DELETE CASCADE,
    FOREIGN KEY (alertaId) REFERENCES alerta(id)
);

-- 11. Captura
CREATE TABLE IF NOT EXISTS captura (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    valor DECIMAL(12,2) NOT NULL,
    id_componente INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    parametroId INT NOT NULL,
    FOREIGN KEY (id_componente) REFERENCES componente(id) ON DELETE CASCADE,
    FOREIGN KEY (parametroId) REFERENCES parametro_limite(id)
);

-- =====================================================
-- CARGA INICIAL (SEED)
-- =====================================================

INSERT INTO localidade (cep, logradouro, bairro, cidade, estado)
VALUES ('01414001', 'Rua Haddock Lobo, 595', 'Cerqueira César', 'São Paulo', 'SP');

INSERT INTO empresa (razao_social, cnpj, status, localidadeId)
VALUES ('Nexus Tecnologia LTDA', '12345678000199', 'ATIVA', 1);

-- Equipamentos autorizados na base
INSERT INTO equipamento (numero_serie, mac_address, id_empresa)
VALUES 
('LEGADO-SRV-1', '00:1A:2B:3C:4D:5E', 1),
('LEGADO-SRV-2', '00:1A:2B:3C:4D:5G', 1),
('LEGADO-SRV-3', '00:1A:2B:3C:4D:5F', 1),
('LEGADO-SRV-4', '00:1A:2B:3C:4D:60', 1);

INSERT INTO cargo (nome, descricao, nivel_acesso, EmpresaId)
VALUES
('Admin', 'Acesso completo ao sistema', 3, 1),
('Gestor', 'Gerenciamento de usuarios e operacoes', 2, 1),
('Analista', 'Visualizacao e analise de dados', 1, 1);

INSERT INTO usuario
(nome, cpf, email, telefone, senha, status, id_empresa, id_cargo, criado_em, atualizado_em)
VALUES
('Lucas Martins', '12345678901', 'lucas@exemplo.com', '11987654321', 'Teste123', 'ATIVO', 1, 1, '2026-01-10 08:30:00', '2026-10-16 09:15:00'),
('Mariana Costa', '23456789012', 'mariana@exemplo.com', '11987654322', 'Teste123', 'ATIVO', 1, 2, '2026-02-15 10:20:00', '2026-10-15 14:40:00'),
('Pedro Almeida', '34567890123', 'pedro@exemplo.com', '11987654323', 'Teste123', 'ATIVO', 1, 3, '2026-03-05 13:45:00', '2026-10-14 16:10:00'),
('Ana Souza', '45678901234', 'ana@exemplo.com', '11987654324', 'Teste123', 'INATIVO', 1, 3, '2026-03-20 09:00:00', '2026-09-30 11:25:00'),
('Gabriel Santos', '56789012345', 'gabriel@exemplo.com', '11987654325', 'Teste123', 'ATIVO', 1, 2, '2026-04-12 15:30:00', '2026-10-13 08:50:00'),
('Julia Oliveira', '67890123456', 'julia@exemplo.com', '11987654326', 'Teste123', 'ATIVO', 1, 3, '2026-05-08 11:15:00', '2026-10-12 17:30:00'),
('Rafael Lima', '78901234567', 'rafael@exemplo.com', '11987654327', 'Teste123', 'INATIVO', 1, 3, '2026-06-18 14:00:00', '2026-08-25 10:00:00'),
('Beatriz Ferreira', '89012345678', 'beatriz@exemplo.com', '11987654328', 'Teste123', 'ATIVO', 1, 1, '2026-07-02 07:45:00', '2026-10-16 12:20:00'),
('Matheus Rodrigues', '90123456789', 'matheus@exemplo.com', '11987654329', 'Teste123', 'ATIVO', 1, 2, '2026-08-21 16:50:00', '2026-10-11 13:35:00'),
('Camila Pereira', '01234567890', 'camila@exemplo.com', '11987654330', 'Teste123', 'ATIVO', 1, 3, '2026-10-01 09:10:00', '2026-10-16 15:45:00');

-- Servidores iniciais para os quatro cenários de uso
INSERT INTO servidor
(id_equipamento, hostname, ip, sistema_operacional, responsabilidade, id_local)
VALUES
(1, 'srv-optikus-storage-01', '192.168.0.10', 'Windows 11', 'Armazenamento', 1),
(2, 'srv-optikus-ia-01', '192.168.0.11', 'Ubuntu Server', 'Processamento de IA', 1),
(3, 'srv-optikus-nvr-01', '192.168.0.12', 'Windows Server', 'NVR', 1),
(4, 'srv-optikus-stream-01', '192.168.0.13', 'Ubuntu Server', 'Gateway de Streaming', 1);

INSERT INTO tipo_componente (nome) 
VALUES 
('CPU'), 
('Memoria'), 
('Disco'), 
('REDE');

-- Componentes monitorados nos quatro servidores
INSERT INTO componente
(nome, fabricante, modelo, capacidade, unidade_medida, status, id_servidor, id_tipo)
SELECT 'Processador', NULL, NULL, NULL, '%', 'ATIVO', s.id, tc.id
FROM servidor s
JOIN tipo_componente tc ON tc.nome = 'CPU'
WHERE s.responsabilidade IN ('Armazenamento', 'Processamento de IA', 'NVR', 'Gateway de Streaming');

INSERT INTO componente
(nome, fabricante, modelo, capacidade, unidade_medida, status, id_servidor, id_tipo)
SELECT 'Memória RAM', NULL, NULL, NULL, '%', 'ATIVO', s.id, tc.id
FROM servidor s
JOIN tipo_componente tc ON tc.nome = 'Memoria'
WHERE s.responsabilidade IN ('Armazenamento', 'Processamento de IA', 'NVR', 'Gateway de Streaming');

INSERT INTO componente
(nome, fabricante, modelo, capacidade, unidade_medida, status, id_servidor, id_tipo)
SELECT 'Disco Principal', NULL, NULL, NULL, '%', 'ATIVO', s.id, tc.id
FROM servidor s
JOIN tipo_componente tc ON tc.nome = 'Disco'
WHERE s.responsabilidade IN ('Armazenamento', 'Processamento de IA', 'NVR', 'Gateway de Streaming');

INSERT INTO alerta (nivel, status)
VALUES
('BAIXO', 'ABERTO'),
('MEDIO', 'ABERTO'),
('ALTO', 'ABERTO'),
('CRITICO', 'ABERTO');

-- Limites de 1: Armazenamento de Vídeo
INSERT INTO parametro_limite
(valor_minimo, valor_maximo, criticidade, id_componente, alertaId)
SELECT faixas.minimo, faixas.maximo, faixas.criticidade,
       c.id,
       (SELECT a.id FROM alerta a WHERE a.nivel = faixas.criticidade LIMIT 1)
FROM componente c
JOIN tipo_componente tc ON tc.id = c.id_tipo
JOIN servidor s ON s.id = c.id_servidor
JOIN (
    SELECT 'CPU' AS tipo, 0.00 AS minimo, 79.99 AS maximo, 'MEDIO' AS criticidade
    UNION ALL SELECT 'CPU', 80.00, 89.99, 'ALTO'
    UNION ALL SELECT 'CPU', 90.00, 100.00, 'CRITICO'
    UNION ALL SELECT 'Memoria', 0.00, 79.99, 'MEDIO'
    UNION ALL SELECT 'Memoria', 80.00, 89.99, 'ALTO'
    UNION ALL SELECT 'Memoria', 90.00, 100.00, 'CRITICO'
    UNION ALL SELECT 'Disco', 0.00, 84.99, 'MEDIO'
    UNION ALL SELECT 'Disco', 85.00, 94.99, 'ALTO'
    UNION ALL SELECT 'Disco', 95.00, 100.00, 'CRITICO'
) faixas ON faixas.tipo = tc.nome
WHERE s.responsabilidade = 'Armazenamento';

-- Limites de 2: Processamento de IA
INSERT INTO parametro_limite
(valor_minimo, valor_maximo, criticidade, id_componente, alertaId)
SELECT faixas.minimo, faixas.maximo, faixas.criticidade,
       c.id,
       (SELECT a.id FROM alerta a WHERE a.nivel = faixas.criticidade LIMIT 1)
FROM componente c
JOIN tipo_componente tc ON tc.id = c.id_tipo
JOIN servidor s ON s.id = c.id_servidor
JOIN (
    SELECT 'CPU' AS tipo, 0.00 AS minimo, 84.99 AS maximo, 'MEDIO' AS criticidade
    UNION ALL SELECT 'CPU', 85.00, 94.99, 'ALTO'
    UNION ALL SELECT 'CPU', 95.00, 100.00, 'CRITICO'
    UNION ALL SELECT 'Memoria', 0.00, 89.99, 'MEDIO'
    UNION ALL SELECT 'Memoria', 90.00, 96.99, 'ALTO'
    UNION ALL SELECT 'Memoria', 97.00, 100.00, 'CRITICO'
    UNION ALL SELECT 'Disco', 0.00, 79.99, 'MEDIO'
    UNION ALL SELECT 'Disco', 80.00, 89.99, 'ALTO'
    UNION ALL SELECT 'Disco', 90.00, 100.00, 'CRITICO'
) faixas ON faixas.tipo = tc.nome
WHERE s.responsabilidade = 'Processamento de IA';

-- Limites de 3: Gravação NVR
INSERT INTO parametro_limite
(valor_minimo, valor_maximo, criticidade, id_componente, alertaId)
SELECT faixas.minimo, faixas.maximo, faixas.criticidade,
       c.id,
       (SELECT a.id FROM alerta a WHERE a.nivel = faixas.criticidade LIMIT 1)
FROM componente c
JOIN tipo_componente tc ON tc.id = c.id_tipo
JOIN servidor s ON s.id = c.id_servidor
JOIN (
    SELECT 'CPU' AS tipo, 0.00 AS minimo, 79.99 AS maximo, 'MEDIO' AS criticidade
    UNION ALL SELECT 'CPU', 80.00, 89.99, 'ALTO'
    UNION ALL SELECT 'CPU', 90.00, 100.00, 'CRITICO'
    UNION ALL SELECT 'Memoria', 0.00, 84.99, 'MEDIO'
    UNION ALL SELECT 'Memoria', 85.00, 94.99, 'ALTO'
    UNION ALL SELECT 'Memoria', 95.00, 100.00, 'CRITICO'
    UNION ALL SELECT 'Disco', 0.00, 84.99, 'MEDIO'
    UNION ALL SELECT 'Disco', 85.00, 94.99, 'ALTO'
    UNION ALL SELECT 'Disco', 95.00, 100.00, 'CRITICO'
) faixas ON faixas.tipo = tc.nome
WHERE s.responsabilidade = 'NVR';

-- Limites de 4: Gateway de Streaming
INSERT INTO parametro_limite
(valor_minimo, valor_maximo, criticidade, id_componente, alertaId)
SELECT faixas.minimo, faixas.maximo, faixas.criticidade,
       c.id,
       (SELECT a.id FROM alerta a WHERE a.nivel = faixas.criticidade LIMIT 1)
FROM componente c
JOIN tipo_componente tc ON tc.id = c.id_tipo
JOIN servidor s ON s.id = c.id_servidor
JOIN (
    SELECT 'CPU' AS tipo, 0.00 AS minimo, 74.99 AS maximo, 'MEDIO' AS criticidade
    UNION ALL SELECT 'CPU', 75.00, 89.99, 'ALTO'
    UNION ALL SELECT 'CPU', 90.00, 100.00, 'CRITICO'
    UNION ALL SELECT 'Memoria', 0.00, 79.99, 'MEDIO'
    UNION ALL SELECT 'Memoria', 80.00, 89.99, 'ALTO'
    UNION ALL SELECT 'Memoria', 90.00, 100.00, 'CRITICO'
    UNION ALL SELECT 'Disco', 0.00, 79.99, 'MEDIO'
    UNION ALL SELECT 'Disco', 80.00, 89.99, 'ALTO'
    UNION ALL SELECT 'Disco', 90.00, 100.00, 'CRITICO'
) faixas ON faixas.tipo = tc.nome
WHERE s.responsabilidade = 'Gateway de Streaming';

-- Leituras fictícias somente para testar a comparação de hoje com o dia anterior
-- Em produção, essas capturas serão inseridas pelo coletor Python/Java.
INSERT INTO captura (valor, id_componente, parametroId, criado_em)
SELECT leituras.valor, c.id, pl.id, leituras.criado_em
FROM (
    SELECT valores.responsabilidade, valores.tipo,
           CASE WHEN periodo.dia = 'ONTEM' THEN valores.valor_ontem ELSE valores.valor_hoje END AS valor,
           periodo.criado_em
    FROM (
        SELECT 'Armazenamento' AS responsabilidade, 'CPU' AS tipo, 38.00 AS valor_ontem, 42.00 AS valor_hoje
        UNION ALL SELECT 'Armazenamento', 'Memoria', 72.00, 76.00
        UNION ALL SELECT 'Armazenamento', 'Disco', 84.00, 88.00
        UNION ALL SELECT 'Processamento de IA', 'CPU', 76.00, 82.00
        UNION ALL SELECT 'Processamento de IA', 'Memoria', 88.00, 94.00
        UNION ALL SELECT 'Processamento de IA', 'Disco', 68.00, 72.00
        UNION ALL SELECT 'NVR', 'CPU', 62.00, 68.00
        UNION ALL SELECT 'NVR', 'Memoria', 82.00, 88.00
        UNION ALL SELECT 'NVR', 'Disco', 88.00, 92.00
        UNION ALL SELECT 'Gateway de Streaming', 'CPU', 76.00, 82.00
        UNION ALL SELECT 'Gateway de Streaming', 'Memoria', 71.00, 77.00
        UNION ALL SELECT 'Gateway de Streaming', 'Disco', 63.00, 69.00
    ) valores
    CROSS JOIN (
        SELECT 'ONTEM' AS dia, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY) AS criado_em
        UNION ALL SELECT 'HOJE', CURRENT_TIMESTAMP
    ) periodo
) leituras
JOIN servidor s ON s.responsabilidade = leituras.responsabilidade
JOIN componente c ON c.id_servidor = s.id AND c.status = 'ATIVO'
JOIN tipo_componente tc ON tc.id = c.id_tipo AND tc.nome = leituras.tipo
JOIN parametro_limite pl
  ON pl.id_componente = c.id
  AND leituras.valor BETWEEN pl.valor_minimo AND pl.valor_maximo
WHERE NOT EXISTS (
    SELECT 1
    FROM captura existente
    WHERE existente.id_componente = c.id
      AND existente.criado_em >= DATE_FORMAT(leituras.criado_em, '%Y-%m-%d %H:00:00')
      AND existente.criado_em < DATE_ADD(
          DATE_FORMAT(leituras.criado_em, '%Y-%m-%d %H:00:00'),
          INTERVAL 1 HOUR
      )
);

-- =====================================================
-- CONSULTAS DE VALIDAÇÃO ÚTEIS
-- =====================================================

-- 1. Validar se o MAC Address existe na base e se já está vinculado a um servidor:
SELECT 
    e.id AS id_equipamento,
    e.numero_serie,
    e.mac_address,
    e.id_empresa,
    s.id AS id_servidor,
    CASE 
        WHEN s.id IS NOT NULL THEN 'JA_CADASTRADO'
        ELSE 'AUTORIZADO_PARA_CADASTRO'
    END AS situacao
FROM equipamento e
LEFT JOIN servidor s ON s.id_equipamento = e.id
WHERE e.mac_address = '00:1A:2B:3C:4D:5G';

-- 2. Consultar servidores ativos com seus dados de equipamento e empresa:
SELECT 
    s.id,
    e.numero_serie,
    e.mac_address,
    s.hostname,
    s.ip,
    s.status,
    emp.razao_social AS empresa
FROM servidor s
JOIN equipamento e ON s.id_equipamento = e.id
JOIN empresa emp ON e.id_empresa = emp.id;

SELECT * FROM captura;
SELECT * FROM componente;
SELECT * FROM tipo_componente;
SELECT * FROM equipamento;
SELECT * FROM alerta;
SELECT * FROM parametro_limite;

SELECT c.nome, ca.valor, c.unidade_medida, tc.nome, pl.criticidade, a.nivel, a.status
  FROM componente c
  JOIN captura ca ON ca.id_componente = c.id 
  JOIN parametro_limite pl ON ca.parametroId = pl.id
  JOIN alerta a ON pl.alertaId = a.id
  JOIN tipo_componente tc ON c.id_tipo = tc.id;
  
  
	CREATE OR REPLACE VIEW vwListarServidor AS
SELECT
  servidor.id,
  equipamento.numero_serie,
  servidor.hostname,
  servidor.ip,
  equipamento.mac_address,
  servidor.responsabilidade,
  servidor.sistema_operacional,
  servidor.versao_so,
  servidor.status AS stats,
  empresa.razao_social AS empresa_razao_social,
  CONCAT_WS(' - ',
    CONCAT_WS(', ', NULLIF(localidade.logradouro, ''), NULLIF(localidade.bairro, '')),
    CONCAT(localidade.cidade, '/', localidade.estado)
  ) AS localizacao
FROM servidor
JOIN equipamento ON servidor.id_equipamento = equipamento.id
JOIN localidade ON servidor.id_local = localidade.id
JOIN empresa ON equipamento.id_empresa = empresa.id;
    
SELECT * FROM vwListarServidor;


    
    CREATE OR REPLACE VIEW vwListarLocalidades AS
SELECT
  localidade.id,
  CONCAT_WS(' - ',
    CONCAT_WS(', ', NULLIF(localidade.logradouro, ''), NULLIF(localidade.bairro, '')),
    CONCAT(localidade.cidade, '/', localidade.estado)
  ) AS nome,
  empresa.razao_social AS empresa_razao_social
FROM localidade
JOIN empresa ON empresa.localidadeId = localidade.id;

CREATE OR REPLACE VIEW vwValidarNumeroSerie AS
SELECT
  equipamento.id AS id_equipamento,
  equipamento.numero_serie,
  equipamento.mac_address,
  empresa.razao_social AS empresa_razao_social
FROM equipamento
JOIN empresa ON equipamento.id_empresa = empresa.id
WHERE NOT EXISTS (
  SELECT 1
  FROM servidor
  WHERE servidor.id_equipamento = equipamento.id
);
    
    SELECT * FROM vwListarLocalidades;
    
    SELECT * FROM vwValidarNumeroSerie;
    

-- 1. Precisão de 3 casas. Sem isso, 0.035 s é gravado como 0.04
ALTER TABLE captura MODIFY valor DECIMAL(12,3) NOT NULL;
ALTER TABLE parametro_limite
  MODIFY valor_minimo DECIMAL(12,3) NOT NULL,
  MODIFY valor_maximo DECIMAL(12,3) NOT NULL;

-- 2. Servidores que já existem (os 4 do seed): cria os componentes de rede
INSERT INTO componente (nome, unidade_medida, status, id_servidor, id_tipo)
SELECT n.nome, n.unidade, 'ATIVO', s.id, tc.id
FROM servidor s
CROSS JOIN (
    SELECT 'Latência' AS nome, 'ms' AS unidade
    UNION ALL SELECT 'Jitter', 'ms'
    UNION ALL SELECT 'Perda de Pacotes', '%'
    UNION ALL SELECT 'Segundos Perdidos', 's'
) n
JOIN tipo_componente tc ON tc.nome = 'REDE'
WHERE NOT EXISTS (
  SELECT 1 FROM componente c
  WHERE c.id_servidor = s.id AND c.nome = n.nome
);

-- 3. ...e os limites desses componentes
INSERT INTO parametro_limite (valor_minimo, valor_maximo, criticidade, id_componente, alertaId)
SELECT f.minimo, f.maximo, f.crit, c.id, a.id
FROM componente c
JOIN (
    SELECT 'Latência' AS nome, 0.000 AS minimo, 150.000 AS maximo, 'BAIXO' AS crit
    UNION ALL SELECT 'Latência', 150.001, 300.000, 'MEDIO'
    UNION ALL SELECT 'Latência', 300.001, 99999.000, 'CRITICO'
    UNION ALL SELECT 'Jitter', 0.000, 10.000, 'BAIXO'
    UNION ALL SELECT 'Jitter', 10.001, 30.000, 'MEDIO'
    UNION ALL SELECT 'Jitter', 30.001, 99999.000, 'CRITICO'
    UNION ALL SELECT 'Perda de Pacotes', 0.000, 1.000, 'BAIXO'
    UNION ALL SELECT 'Perda de Pacotes', 1.001, 100.000, 'CRITICO'
    UNION ALL SELECT 'Segundos Perdidos', 0.000, 0.035, 'BAIXO'
    UNION ALL SELECT 'Segundos Perdidos', 0.036, 0.500, 'MEDIO'
    UNION ALL SELECT 'Segundos Perdidos', 0.501, 1.000, 'ALTO'
    UNION ALL SELECT 'Segundos Perdidos', 1.001, 99999.000, 'CRITICO'
) f ON f.nome = c.nome
JOIN alerta a ON a.nivel = f.crit
WHERE NOT EXISTS (SELECT 1 FROM parametro_limite p WHERE p.id_componente = c.id);

-- 4. Servidores novos: já nascem com os 4 componentes e os limites
DROP TRIGGER IF EXISTS trg_servidor_componentes_rede;
DELIMITER $$
CREATE TRIGGER trg_servidor_componentes_rede
AFTER INSERT ON servidor
FOR EACH ROW
BEGIN
  DECLARE v_tipo INT;

  SELECT id INTO v_tipo FROM tipo_componente WHERE nome = 'REDE' LIMIT 1;

  IF v_tipo IS NOT NULL THEN
    INSERT INTO componente (nome, unidade_medida, status, id_servidor, id_tipo)
    SELECT n.nome, n.unidade, 'ATIVO', NEW.id, v_tipo
    FROM (
        SELECT 'Latência' AS nome, 'ms' AS unidade
        UNION ALL SELECT 'Jitter', 'ms'
        UNION ALL SELECT 'Perda de Pacotes', '%'
        UNION ALL SELECT 'Segundos Perdidos', 's'
    ) n;

    INSERT INTO parametro_limite (valor_minimo, valor_maximo, criticidade, id_componente, alertaId)
    SELECT f.minimo, f.maximo, f.crit, c.id, a.id
    FROM componente c
    JOIN (
        SELECT 'Latência' AS nome, 0.000 AS minimo, 150.000 AS maximo, 'BAIXO' AS crit
        UNION ALL SELECT 'Latência', 150.001, 300.000, 'MEDIO'
        UNION ALL SELECT 'Latência', 300.001, 99999.000, 'CRITICO'
        UNION ALL SELECT 'Jitter', 0.000, 10.000, 'BAIXO'
        UNION ALL SELECT 'Jitter', 10.001, 30.000, 'MEDIO'
        UNION ALL SELECT 'Jitter', 30.001, 99999.000, 'CRITICO'
        UNION ALL SELECT 'Perda de Pacotes', 0.000, 1.000, 'BAIXO'
        UNION ALL SELECT 'Perda de Pacotes', 1.001, 100.000, 'CRITICO'
        UNION ALL SELECT 'Segundos Perdidos', 0.000, 0.035, 'BAIXO'
        UNION ALL SELECT 'Segundos Perdidos', 0.036, 0.500, 'MEDIO'
        UNION ALL SELECT 'Segundos Perdidos', 0.501, 1.000, 'ALTO'
        UNION ALL SELECT 'Segundos Perdidos', 1.001, 99999.000, 'CRITICO'
    ) f ON f.nome = c.nome
    JOIN alerta a ON a.nivel = f.crit
    WHERE c.id_servidor = NEW.id
      AND c.id_tipo = v_tipo;
  END IF;
END$$
DELIMITER ;

-- 5. (Opcional) View para ver qual captura caiu em qual limite e alerta
CREATE OR REPLACE VIEW vwCapturaAlerta AS
SELECT
  ca.id AS id_captura,
  ca.criado_em AS data_captura,
  s.id AS id_servidor,
  s.hostname,
  c.nome AS componente,
  ca.valor,
  c.unidade_medida,
  pl.id AS id_parametro,
  pl.valor_minimo,
  pl.valor_maximo,
  pl.criticidade,
  a.id AS id_alerta,
  a.nivel AS nivel_alerta,
  a.status AS status_alerta
FROM captura ca
JOIN componente c ON c.id = ca.id_componente
JOIN servidor s ON s.id = c.id_servidor
JOIN parametro_limite pl ON pl.id = ca.parametroId
JOIN alerta a ON a.id = pl.alertaId;

SELECT * FROM vwCapturaAlerta;

SELECT servidor, componente, tipo_componente, valor_captura, unidade_medida,
       criticidade, nivel_alerta, status_alerta, data_captura
FROM (
    SELECT
        s.hostname        AS servidor,
        c.nome            AS componente,
        tc.nome           AS tipo_componente,
        ca.valor          AS valor_captura,
        c.unidade_medida  AS unidade_medida,
        pl.criticidade    AS criticidade,
        a.nivel           AS nivel_alerta,
        a.status          AS status_alerta,
        ca.criado_em      AS data_captura,
        ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY ca.criado_em DESC, ca.id DESC) AS rn
    FROM captura ca
    JOIN componente c        ON c.id  = ca.id_componente
    JOIN tipo_componente tc  ON tc.id = c.id_tipo
    JOIN servidor s          ON s.id  = c.id_servidor
    JOIN parametro_limite pl ON pl.id = ca.parametroId
    JOIN alerta a            ON a.id  = pl.alertaId
    WHERE tc.nome = 'REDE'
) t
WHERE rn = 1
ORDER BY servidor, componente;

SELECT
    s.hostname        AS servidor,
    c.nome            AS componente,
    tc.nome           AS tipo_componente,
    ca.valor          AS valor_captura,
    c.unidade_medida  AS unidade_medida,
    pl.criticidade    AS criticidade,
    a.nivel           AS nivel_alerta,
    a.status          AS status_alerta,
    ca.criado_em      AS data_captura
FROM captura ca
JOIN componente c        ON c.id  = ca.id_componente
JOIN tipo_componente tc  ON tc.id = c.id_tipo
JOIN servidor s          ON s.id  = c.id_servidor
JOIN parametro_limite pl ON pl.id = ca.parametroId
JOIN alerta a            ON a.id  = pl.alertaId
WHERE pl.criticidade IN ('ALTO', 'CRITICO')
AND ca.criado_em >= NOW() - INTERVAL 1 HOUR
ORDER BY ca.criado_em DESC;


