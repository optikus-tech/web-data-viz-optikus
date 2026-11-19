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

-- 3. Equipamento
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

-- 6. Servidor
CREATE TABLE IF NOT EXISTS servidor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_serie VARCHAR(64) NOT NULL UNIQUE,
    hostname VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    mac_address VARCHAR(17),
    sistema_operacional VARCHAR(80),
    versao_so VARCHAR(50),
    responsabilidade VARCHAR(80) NOT NULL DEFAULT 'Não informada',
    status ENUM('ONLINE', 'OFFLINE', 'MANUTENCAO') DEFAULT 'ONLINE',
    ultima_comunicacao DATETIME,
    id_local INT NOT NULL,
    EmpresaId INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_local) REFERENCES localidade(id) ON DELETE CASCADE,
    FOREIGN KEY (EmpresaId) REFERENCES empresa(id) ON DELETE CASCADE
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

-- 10. Parâmetro de Limite (diferenciando faixas por componente e vinculado a alerta)
CREATE TABLE IF NOT EXISTS parametro_limite (
    id INT AUTO_INCREMENT PRIMARY KEY,
    valor_minimo DECIMAL(10,2) NOT NULL,
    valor_maximo DECIMAL(10,2) NOT NULL,
    criticidade ENUM('BAIXO', 'MEDIO', 'ALTO', 'CRITICO'),
    id_componente INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    alertaId INT NOT NULL,
    FOREIGN KEY (id_componente) REFERENCES componente(id) ON DELETE CASCADE,
    FOREIGN KEY (alertaId) REFERENCES alerta(id)
);

-- 11. Captura (vinculada ao componente e ao parâmetro de limite atingido)
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

INSERT INTO equipamento (numero_serie, mac_address, id_empresa)
VALUES ('LEGADO-SRV-1', '00:1A:2B:3C:4D:5E', 1);

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

INSERT INTO servidor (numero_serie, hostname, ip, mac_address, sistema_operacional, responsabilidade, id_local, EmpresaId)
VALUES ('LEGADO-SRV-1', 'DanielRocha', '192.168.0.10', '00:1A:2B:3C:4D:5E', 'Windows 11', 'Não informada', 1, 1);

INSERT INTO tipo_componente (nome) 
VALUES 
('CPU'), 
('Memoria'), 
('Disco'), 
('REDE');

INSERT INTO componente (nome, fabricante, modelo, capacidade, unidade_medida, status, id_servidor, id_tipo)
VALUES 
('Processador', NULL, NULL, NULL, '%', 'ATIVO', 1, 1),
('Memória RAM', NULL, NULL, NULL, '%', 'ATIVO', 1, 2),
('Disco Principal', NULL, NULL, NULL, '%', 'ATIVO', 1, 3),
('Segundos Perdidos', NULL, NULL, NULL, 's', 'ATIVO', 1, 4);

-- Alertas base (IDs 1 a 4 correspondendo aos níveis)
INSERT INTO alerta (nivel, status)
VALUES
('BAIXO', 'ABERTO'),
('MEDIO', 'ABERTO'),
('ALTO', 'ABERTO'),
('CRITICO', 'ABERTO');

-- Parâmetros de Limite diferenciados por componente e vinculados ao alertaId
INSERT INTO parametro_limite (valor_minimo, valor_maximo, criticidade, id_componente, alertaId)
VALUES
-- CPU (ID 1)
(0, 79, 'MEDIO', 1, 2),
(80, 89, 'ALTO', 1, 3),
(90, 100, 'CRITICO', 1, 4),

-- RAM (ID 2)
(0, 59, 'MEDIO', 2, 2),
(60, 89, 'ALTO', 2, 3),
(90, 100, 'CRITICO', 2, 4),

-- DISCO (ID 3)
(0, 74, 'MEDIO', 3, 2),
(75, 89, 'ALTO', 3, 3),
(90, 100, 'CRITICO', 3, 4),

-- Rede (ID 4)
(0,     0.035, 'BAIXO',   4, 1),
(0.035, 0.5,   'MEDIO',   4, 2),
(0.5,   1,     'ALTO',    4, 3),
(1,     9999,  'CRITICO', 4, 4);

-- =====================================================
-- CONSULTAS DE VALIDAÇÃO ÚTEIS
-- =====================================================

SELECT * FROM captura;
SELECT * FROM componente;
SELECT * FROM tipo_componente;
SELECT id, numero_serie, hostname, id_local, EmpresaId FROM servidor;
SELECT * FROM equipamento;
SELECT id, nome, id_servidor FROM componente;
SELECT * FROM alerta;
SELECT * FROM parametro_limite;

SELECT c.nome, ca.valor, c.unidade_medida, tc.nome, pl.criticidade, a.nivel, a.status
  FROM componente c
  JOIN captura ca ON ca.id_componente = c.id 
  JOIN parametro_limite pl ON ca.parametroId = pl.id
  JOIN alerta a ON pl.alertaId = a.id
  JOIN tipo_componente tc ON c.id_tipo = tc.id;
  
  