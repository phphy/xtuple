CREATE OR REPLACE FUNCTION XTFLOOR(pValue NUMERIC, pPrecision INTEGER) RETURNS NUMERIC IMMUTABLE AS $$
BEGIN
  RETURN FLOOR(pValue * 10^(pPrecision))/(10^(pPrecision));
END
$$ LANGUAGE plpgsql;