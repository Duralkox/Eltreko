SET @has_unique := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'protokoly'
    AND column_name = 'numer_protokolu'
    AND non_unique = 0
);

SET @drop_sql := IF(@has_unique > 0, 'ALTER TABLE protokoly DROP INDEX numer_protokolu', 'SELECT 1');
PREPARE stmt_drop FROM @drop_sql;
EXECUTE stmt_drop;
DEALLOCATE PREPARE stmt_drop;

ALTER TABLE protokoly
  MODIFY COLUMN numer_protokolu VARCHAR(220) NOT NULL;
