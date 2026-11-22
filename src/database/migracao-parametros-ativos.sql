USE optikus;

ALTER TABLE parametro_limite
  ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1;
