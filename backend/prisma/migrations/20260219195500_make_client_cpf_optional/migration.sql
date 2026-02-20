-- CPF opcional para cadastro de clientes.
ALTER TABLE "Client"
ALTER COLUMN "cpf" DROP NOT NULL;

-- Higieniza valores vazios legados para NULL.
UPDATE "Client"
SET "cpf" = NULL
WHERE NULLIF(BTRIM("cpf"), '') IS NULL;
