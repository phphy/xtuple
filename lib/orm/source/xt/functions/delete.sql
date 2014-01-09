/**
    Procedure for deleting a record and its children from the database.

    @param {Text} Data hash that can parsed into a JavaScript object or array.
    @param {String} [dataHash.username] Username. Required.
    @param {String} [dataHash.nameSpace] Namespace. Required.
    @param {String} [dataHash.type] Type. Required.
    @param {Number} [dataHash.etag] Optional record id version for optimistic locking.
    @param {Object} [dataHash.lock] Lock information for pessemistic locking.
    @param {Number} [dataHash.lock.key] Lock key for pessemistic locking.
    @param {String} [dataHash.encryptionKey] Encryption key.

    Sample usage:
    select xt.js_init();
    select xt.delete('{
      "username": "admin",
      "nameSpace":"XM",
      "type": "Contact",
      "id": "10009",
      "etag": "e5b73834-492d-47b1-89a2-10b354b8f5e3",
      "prettyPrint": true
    }');

    select xt.delete('[
      {
        "username": "admin",
        "nameSpace":"XM",
        "type": "Contact",
        "id": "10009",
        "etag": "46f5e363-79b5-4302-fa19-05a184ce15f1"
      },
      {
        "username": "admin",
        "nameSpace":"XM",
        "type": "Contact",
        "id": "10010",
        "etag": "a8d40bcd-efb2-4ec4-c590-3320ee3ceb34"
      }    
    ]');
*/
create or replace function xt.delete(data_hash text) returns boolean as $$
  var dataArray = JSON.parse(data_hash),
    isArray = XT.typeOf(dataArray) === 'array',
    result = [],
    data = Object.create(XT.Data),
    options,
    observer,
    rec;

  /* Make sure the input is an array */
  dataArray = isArray ? dataArray : [dataArray];
  
  try {
    /* Loop through each input and do the work */
    dataArray.forEach(function (dataHash) {
      options = JSON.parse(JSON.stringify(dataHash));

      dataHash.superUser = false;
      if (dataHash.username) { XT.username = dataHash.username; }

      /* get the current version of the record */
      dataHash.includeKeys = true;
      rec = data.retrieveRecord(dataHash);
      if (!rec.data) { plv8.elog(ERROR, "Record not found"); };
      dataHash.data = rec.data;

      /* mark for deletion */
      XT.jsonpatch.updateState(dataHash.data, "delete");

      /* commit the record */
      data.commitRecord(dataHash);

      /* Unset XT.username so it isn't cached for future queries. */
      XT.username = undefined;

      XT.message(204, "No Content");
    });
    
    return true;
    
  } catch (err) {
    XT.error(err);
  }

$$ language plv8;
