-- Los correos pasan a guardarse en minúsculas y sin espacios. Si dos filas solo
-- difirieran en mayúsculas se deja intacta la que chocaría con otra (la columna
-- es UNIQUE) para no tumbar la migración; el administrador la resuelve a mano.
UPDATE "Usuario"
SET "email" = lower(trim("email"))
WHERE "email" <> lower(trim("email"))
  AND NOT EXISTS (
    SELECT 1 FROM "Usuario" u2
    WHERE u2."id" <> "Usuario"."id" AND u2."email" = lower(trim("Usuario"."email"))
  );
