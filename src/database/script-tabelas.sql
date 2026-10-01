CREATE DATABASE IF NOT EXISTS grupo_08;
USE grupo_08;

CREATE TABLE IF NOT EXISTS empresa (
    id_empresa INT AUTO_INCREMENT PRIMARY KEY,
    razao_social VARCHAR(150) NOT NULL, 
    cnpj CHAR(14) NOT NULL UNIQUE,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    stats ENUM('ATIVA','INATIVA') DEFAULT 'ATIVA'
);

CREATE TABLE IF NOT EXISTS cargo (
    id_cargo INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(80) NOT NULL,
    descricao VARCHAR(255),
    nivel_acesso INT
);


CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    cpf CHAR(11) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    senha VARCHAR(255) NOT NULL,
    stats ENUM('ATIVO','INATIVO') DEFAULT 'ATIVO',

    id_empresa INT NOT NULL,
    id_cargo INT NOT NULL,

    CONSTRAINT fk_usuario_empresa
        FOREIGN KEY (id_empresa)
        REFERENCES empresa(id_empresa),

    CONSTRAINT fk_usuario_cargo
        FOREIGN KEY (id_cargo)
        REFERENCES cargo(id_cargo)
);


CREATE TABLE IF NOT EXISTS localidade (
    id_local INT AUTO_INCREMENT PRIMARY KEY,
    cep CHAR(8),
	logradouro VARCHAR(150) NOT NULL,
	bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
	estado CHAR(2) NOT NULL,
	complemento VARCHAR(100),

    id_empresa INT NOT NULL,

    CONSTRAINT fk_local_empresa
        FOREIGN KEY (id_empresa)
        REFERENCES empresa(id_empresa)
);


CREATE TABLE IF NOT EXISTS servidor (
    id_servidor INT AUTO_INCREMENT PRIMARY KEY,
    hostname VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    mac_address VARCHAR(17),
    sistema_operacional VARCHAR(80),
    versao_so VARCHAR(50),
    stats ENUM('ONLINE','OFFLINE','MANUTENCAO') DEFAULT 'ONLINE',
    ultima_comunicacao DATETIME,

    id_empresa INT NOT NULL,
    id_local INT NOT NULL,

    CONSTRAINT fk_servidor_empresa
        FOREIGN KEY (id_empresa)
        REFERENCES empresa(id_empresa),

    CONSTRAINT fk_servidor_local
        FOREIGN KEY (id_local)
        REFERENCES localidade(id_local)
);


CREATE TABLE IF NOT EXISTS tipo_componente (
    id_tipo INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE
);


CREATE TABLE IF NOT EXISTS componente (
    id_componente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    fabricante VARCHAR(80),
    modelo VARCHAR(80),
    capacidade DECIMAL(10,2),
    status ENUM('ATIVO','INATIVO') DEFAULT 'ATIVO',

    id_servidor INT NOT NULL,
    id_tipo INT NOT NULL,

    CONSTRAINT fk_componente_servidor
        FOREIGN KEY (id_servidor)
        REFERENCES servidor(id_servidor),

    CONSTRAINT fk_componente_tipo
        FOREIGN KEY (id_tipo)
        REFERENCES tipo_componente(id_tipo)
);


CREATE TABLE IF NOT EXISTS captura (
    id_captura BIGINT AUTO_INCREMENT PRIMARY KEY,
    valor DECIMAL(12,2) NOT NULL,
    unidade_medida VARCHAR(10),
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,

    id_componente INT NOT NULL,

    CONSTRAINT fk_captura_componente
        FOREIGN KEY (id_componente)
        REFERENCES componente(id_componente)
);


CREATE TABLE IF NOT EXISTS alerta (
    id_alerta INT AUTO_INCREMENT PRIMARY KEY,
    nivel ENUM('BAIXO','MEDIO','ALTO','CRITICO') NOT NULL,
    mensagem VARCHAR(255),
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('ABERTO','RESOLVIDO') DEFAULT 'ABERTO',

    id_captura BIGINT NOT NULL,

    CONSTRAINT fk_alerta_captura
        FOREIGN KEY (id_captura)
        REFERENCES captura(id_captura)
);

CREATE TABLE IF NOT EXISTS parametro_limite (
    id_parametro INT AUTO_INCREMENT PRIMARY KEY,
    valor_minimo DECIMAL(10,2) NOT NULL,
    valor_maximo DECIMAL(10,2) NOT NULL,
    criticidade ENUM('BAIXA','MEDIA','ALTA'),

    id_componente INT NOT NULL,

    CONSTRAINT fk_parametro_componente
        FOREIGN KEY (id_componente)
        REFERENCES componente(id_componente)
);


CREATE TABLE IF NOT EXISTS notificacao (
    id_notificacao INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('EMAIL','SMS','WHATSAPP'),
    destinatario VARCHAR(120),
    enviado BOOLEAN DEFAULT FALSE,
    data_envio DATETIME,

    id_alerta INT NOT NULL,

    CONSTRAINT fk_notificacao_alerta
        FOREIGN KEY (id_alerta)
        REFERENCES alerta(id_alerta)
);


INSERT INTO tipo_componente(nome) VALUES
('CPU'),
('RAM'),
('DISCO'),
('GPU'),
('REDE'),
('TEMPERATURA');

INSERT INTO cargo(nome, descricao, nivel_acesso) VALUES
('Administrador','Acesso total',3),
('Gestor','Gerencia servidores',2),
('Operador','Consulta informações',1);
