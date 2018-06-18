CREATE OR REPLACE FUNCTION getMiscTaxTypeId() RETURNS INTEGER AS '
-- Copyright (c) 1999-2014 by OpenMFG LLC, d/b/a xTuple. 
-- See www.xtuple.com/CPAL for the full text of the software license.
DECLARE
  _taxtypeid INTEGER;
BEGIN
  SELECT taxtype_id
    INTO _taxtypeid
    FROM taxtype
   WHERE (taxtype_name=''Misc'');

  RETURN _taxtypeid;
END;
' LANGUAGE 'plpgsql';
