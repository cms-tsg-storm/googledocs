function tsgFindL1HeaderRow(l1menu) {
  for (i = 0; i < l1menu.length; i++)
    if (l1menu[i][0] == "**")
      return l1menu[i];

  throw new Error( "The L1 menu does not have a header starting with \"**\"" );
}

function tsgFindL1PrescaleColumn(header, column) {
  for (i = 0; i < header.length; i++)
    if (header[i] == column)
      return i;

  throw new Error( "The L1 menu does not have the prescale column \"" + column + "\"" );
}

function tsgFindL1MaskColumn(header) {
  for (i = 0; i < header.length; i++)
    if (header[i] == "mask")
      return i;

  throw new Error( "The L1 menu does not have the mask column" );
}

function tsgFindL1SeedRow(l1menu, seed) {
  // look for L1 Algo and Tech triggers by name (alias)
  for (i = 0; i < l1menu.length; i++)
    if (l1menu[i][1] == seed)
      return l1menu[i];
  // look for L1 Tech triggers by bit number
  if (/[0-9]+/.test(seed)) {
    seed = 't' + seed;
    for (i = 0; i < l1menu.length; i++)
      if (l1menu[i][0] == seed)
        return l1menu[i];
  }
  throw new Error( "The L1 menu does not have the seed alias \"" + seed + "\"" );
}


function tsgFindL1SimplePrescale(l1menu, seed, column, mask) {
  try {
    var row = tsgFindL1SeedRow(l1menu, seed);
  }
  catch(err) {
    if (seed == "" || seed == "none")
      // return a parescale of 1 for paths without any L1 seed
      return 1;
    else
      // return a parescale of 0 for missing L1 seeds
      return 0;
  }

  if (row[mask] == 0)
    return row[column];
  else
    return 0;
}

function tsgFindL1ComplexPrescale(l1menu, seeds, column, mask) {
  var options = { l1menu: l1menu, column: column, mask: mask };
  return parse(seeds, options);
}

function tsgFindL1Prescale(l1menu, seeds, column, mask) {
  if (seeds.search(/[ ()]/) == -1)
    return tsgFindL1SimplePrescale(l1menu, seeds, column, mask);
  else
    return tsgFindL1ComplexPrescale(l1menu, seeds, column, mask);
}

var tsgFindL1PrescaleCached = (function() {
  var cache = Object.create(null);

  return function(l1menu, seeds, column, mask) {
    if (! (column in cache))
      cache[column] = Object.create(null);

    if (! (seeds in cache[column]))
      cache[column][seeds] = tsgFindL1Prescale(l1menu, seeds, column, mask);

    return cache[column][seeds];
  };
})();

function tsgFindL1PrescalesForColumn(l1menu, seeds, column, mask) {
  // find the L1 header and column containing the mask
  var header = tsgFindL1HeaderRow(l1menu)
  var mask   = tsgFindL1MaskColumn(header);
  // find the column containing the prescales
  var column = tsgFindL1PrescaleColumn(header, column);

  if (seeds.map)
    return seeds.map(function(seeds){return tsgFindL1PrescaleCached(l1menu, String(seeds), column, mask);});
  else
    return tsgFindL1Prescale(l1menu, seeds, column, mask);
}


function transpose(a) {
  return Object.keys(a[0]).map(
    function (c) { return a.map(function (r) { return r[c]; }); }
  );
}

/**
 * @customfunction
 * Find the L1 prescale for the given seed in the given prescale column of the given menu.
 */
function TSG_FIND_L1_PRESCALE(l1menu, column, seeds) {
  if (! l1menu.map)
    throw new Error( "L1 menu is not a range" );

  // find the L1 header and column containing the mask
  var header = tsgFindL1HeaderRow(l1menu)
  var mask   = tsgFindL1MaskColumn(header);

  if (column.map) {
    // this assumes that the multiple columns as in a *row*, not in a *column*
    return transpose(column[0].map(function(column){return tsgFindL1PrescalesForColumn(l1menu, seeds, column, mask);}));
  }
  else
    return tsgFindL1PrescalesForColumn(l1menu, seeds, column, mask);
}
