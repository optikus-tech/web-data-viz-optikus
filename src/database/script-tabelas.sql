CREATE DATABASE IF NOT EXISTS optikus;
USE optikus;
Drop database optikus;

CREATE TABLE IF NOT EXISTS empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    razao_social VARCHAR(150) NOT NULL UNIQUE,
    cnpj CHAR(14) NOT NULL UNIQUE,
    stats ENUM('ATIVA', 'INATIVA') DEFAULT 'ATIVA',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tipo_componente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cargo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(80) NOT NULL,
    descricao VARCHAR(255),
    nivel_acesso INT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_incidente VARCHAR(45) NOT NULL,
    descricao VARCHAR(250),
    destinatario VARCHAR(45),
    prioridade ENUM('BAIXA', 'MEDIA', 'ALTA'),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS localidade (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cep CHAR(8),
    logradouro VARCHAR(150) NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    complemento VARCHAR(100),
    id_empresa INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresa(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS servidor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostname VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    mac_address VARCHAR(17),
    sistema_operacional VARCHAR(80),
    versao_so VARCHAR(50),
    stats ENUM('ONLINE', 'OFFLINE', 'MANUTENCAO') DEFAULT 'ONLINE',
    ultima_comunicacao DATETIME,
    id_local INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_local) REFERENCES localidade(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    cpf CHAR(11) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    senha VARCHAR(255) NOT NULL,
    stats ENUM('ATIVO', 'INATIVO') DEFAULT 'ATIVO',
    id_empresa INT NOT NULL,
    id_cargo INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresa(id) ON DELETE CASCADE,
    FOREIGN KEY (id_cargo) REFERENCES cargo(id)
);

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

CREATE TABLE IF NOT EXISTS captura (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    valor DECIMAL(12,2) NOT NULL,
    id_componente INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_componente) REFERENCES componente(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parametro_limite (
    id INT AUTO_INCREMENT PRIMARY KEY,
    valor_minimo DECIMAL(10,2) NOT NULL,
    valor_maximo DECIMAL(10,2) NOT NULL,
    criticidade ENUM('BAIXO', 'MEDIO', 'ALTO', 'CRITICO'),
    id_componente INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_componente) REFERENCES componente(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nivel ENUM('BAIXO', 'MEDIO', 'ALTO', 'CRITICO') NOT NULL,
    stats ENUM('ABERTO', 'RESOLVIDO') DEFAULT 'ABERTO',
    id_captura BIGINT NOT NULL,
    id_parametro INT NOT NULL,
    id_incidente INT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_captura) REFERENCES captura(id) ON DELETE CASCADE,
    FOREIGN KEY (id_parametro) REFERENCES parametro_limite(id),
    FOREIGN KEY (id_incidente) REFERENCES incidente(id)
);

INSERT INTO empresa (razao_social, cnpj, stats)
VALUES ('Nexus Tecnologia LTDA', '12345678000199', 'ATIVA');

INSERT INTO cargo (nome, descricao, nivel_acesso)
VALUES
('Admin', 'Acesso completo ao sistema', 3),
('Gestor', 'Gerenciamento de usuarios e operacoes', 2),
('Analista', 'Visualizacao e analise de dados', 1);

INSERT INTO usuario
(nome, cpf, email, telefone, senha, stats, id_empresa, id_cargo, criado_em, atualizado_em)
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


INSERT INTO localidade (cep, logradouro, bairro, cidade, estado, id_empresa)
VALUES ('01414001', 'Rua Haddock Lobo, 595', 'Cerqueira César', 'São Paulo', 'SP', 1);

INSERT INTO servidor (hostname, ip, sistema_operacional, id_local)
VALUES ('servidor-cameras-01', '192.168.0.10', 'Windows 11', 1);

INSERT INTO tipo_componente (nome) VALUES ('REDE');

INSERT INTO componente (nome, unidade_medida, id_servidor, id_tipo)
VALUES
('Segundos Perdidos', 's', 1, 1);

INSERT INTO parametro_limite (valor_minimo, valor_maximo, criticidade, id_componente)
VALUES
(0,     0.035, 'BAIXO',   1),
(0.035, 0.5,   'MEDIO',   1),
(0.5,   1,     'ALTO',    1),
(1,     9999,  'CRITICO', 1);

UPDATE servidor SET hostname = 'note-BRU' WHERE id = 1;

SELECT * FROM captura;
SELECT * FROM componente;
SELECT * FROM tipo_componente;
 
SELECT componente.nome, captura.valor, componente.unidade_medida,tipo_componente.nome AS nome_componente, alerta.nivel FROM componente
JOIN captura ON id_componente = componente.id
JOIN alerta ON id_captura - captura.id
JOIN tipo_componente ON id_tipo = tipo_componente.id;

SELECT id, hostname, id_local FROM servidor;
SELECT id, nome, id_servidor FROM componente;
SELECT * FROM alerta;

SELECT c.id
FROM componente c
JOIN servidor s ON s.id = c.id_servidor
WHERE s.hostname = 'note-BRU' AND c.nome = 'Segundos Perdidos';

SELECT * FROM parametro_limite;

 

