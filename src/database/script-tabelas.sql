-- Arquivo de apoio, caso você queira criar tabelas como as aqui criadas para a API funcionar.
-- Você precisa executar os comandos no banco de dados para criar as tabelas,
-- ter este arquivo aqui não significa que a tabela em seu BD estará como abaixo!

/*
comandos para mysql server
*/

create database grupo_07;
use grupo_07;

create table empresa (
	id int primary key auto_increment,
    razao_social varchar(70),
    cnpj char(14),
    cep char(8),
    complemento varchar(45));
    
    Insert into empresa (razao_social, cnpj, cep, complemento) values
    ("Smart Sampa", 19263728192031, 02939189, "512");
    
create table cargo (
	id int primary key auto_increment,
    nome varchar(45));
    
    Insert into cargo (nome) values
    ("Analista de Sistemas");
    
create table usuario (
	id int auto_increment,
    nome varchar(45),
    cpf char(11),
    telefone varchar(15),
    email varchar(45),
    senha varchar(30),
    empresa_id int,
    cargo_id int,
    constraint pkCompostaUsuario primary key (id, empresa_id),
    constraint fkEmpresaUsuario foreign key (empresa_id) references empresa(id),
    constraint fkCargoUsuario foreign key (cargo_id) references cargo(id));
    
create table servidor (
	id int,
    ip char(15),
    hostname varchar(45),
    sistema_operacional varchar(45),
    empresa_id int,
    constraint pkServidorEmpresa primary key (id, empresa_id),
    constraint fkServidorEmpresa foreign key (empresa_id) references empresa(id));
    
create table componentes (
	id int,
    nome varchar(20),
    servidor_id int,
    servidor_empresa_id int,
    constraint pkComponentesServidorEmpresa primary key (id, servidor_id, servidor_empresa_id),
    constraint fkComponentesServidor foreign key (servidor_id) references servidor(id),
    constraint fkComponentesServidorEmpresa foreign key (servidor_empresa_id) references servidor(empresa_id));
    
create table captura (
	id int primary key auto_increment,
    data_hora datetime default current_timestamp,
    tipo varchar(20),
    valor double,
    unidade_medida varchar(20),
    componentes_id int,
    componentes_servidor_id int,
    componentes_servidor_empresa_id int,
    constraint fkCapturaComponentes foreign key (componentes_id) references componentes(id),
    constraint fkCapturaComponentesServidor foreign key (componentes_servidor_id) references componentes(servidor_id),
    constraint fkCapturaComponentesServidorEmpresa foreign key (componentes_servidor_empresa_id) references componentes(servidor_empresa_id));
    
   
    select*from usuario;