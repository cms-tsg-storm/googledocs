/**
 * @OnlyCurrentDoc
 */

/**
 * Creates a menu entry in the Google Docs UI when the document is opened.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e) {
  // if published as an add-on use createAddonMenu() instead of createMenu('TSG Tools')
  SpreadsheetApp.getUi().createMenu('TSG Tools')
      .addItem('Show L1 Prescales for Online', 'showL1OnlinePrescales')
      .addToUi();
}

/**
 * Opens a sidebar in the document containing the add-on's user interface.
 */
function showL1OnlinePrescales() {
  var html = HtmlService.createHtmlOutputFromFile('L1MenuOnline')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setWidth(800)
      .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, getL1Title());
}


/**
  * Find the row whose first cell starts matches entry.
  *
  * @param{object} data The two-dimensional array containing the spradsheed rows and columns.
  * @param{object} entry The regular expression to be matched against the first cell in each row.
  */
function findRowForEntry(data, entry) {
  for (var i = 0; i < data.length; i++)
    if (data[i][0].toString().match(entry))
      return data[i];

  return null;
}

function getL1Title() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data  = sheet.getDataRange().getValues();
  var title = 'L1 menu';

  // find the DESCRIPTION field, if present
  var descriptionRow = findRowForEntry(data, /^DESCRIPTION=/);
  if (descriptionRow) {
    var desc = descriptionRow[0].toString().split('=');
    if (desc.length > 1)
      title = desc[1];
  }
  return title;
}

function cleanupValue(value) {
  return value.toString().replace(/\s/g, '');
}

function doUpdateL1Text() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data  = sheet.getDataRange().getValues();
  var text  = l1textComment;

  // find the DESCRIPTION field, if present
  var descriptionRow = findRowForEntry(data, /^DESCRIPTION=/);
  if (descriptionRow)
    text += descriptionRow[0].toString() + '\n';

  // find the LUMINOSITY_NOMINAL_HZ_CM2 field, if present
  var luminosityRow = findRowForEntry(data, /^LUMINOSITY_NOMINAL_HZ_CM2=/);
  if (luminosityRow)
    text += luminosityRow[0].toString() + '\n';

  // add an empty line
  text += '\n';

  // find the comment with the labels for the prescale columns, if present
  // Note: there is no specific syntax for this in the L1 editor, in the Google Sheet we mark it with "**" in the first cell
  var commentRow = findRowForEntry(data, /^\*\*/);
  var commentColumns = 0;
  if (commentRow) {
    // skip the first two columns: the first is "**" and the second is empty
    commentColumns = commentRow.length - 2;
    for (var i = 2; i < commentRow.length; i++)
      if (commentRow[i] == '') {
        // stop reading at this column
        commentColumns = i - 2;
        break;
      }
  }

  // find the PRESCALE_INDEX for the prescale columns
  var prescaleRow = findRowForEntry(data, /^PRESCALE_INDEX/);
  var prescaleColumns = 0;
  if (prescaleRow) {
    // skip the first two columns: the first is "PRESCALE_INDEX" and the second is empty
    prescaleColumns = prescaleRow.length - 2;
    for (var i = 2; i < prescaleRow.length; i++) {
      if (prescaleRow[i].toString() == '') {
        // stop reading at this column
        prescaleColumns = i - 2;
        break;
      }
    }
  }

  // find the TARGET_LUMI_LEVEL for the prescale columns
  var targetlumiRow = findRowForEntry(data, /^TARGET_LUMI_LEVEL/);
  var targetlumiColumns = 0;
  if (targetlumiRow) {
    // skip the first two columns: the first is "TARGET_LUMI_LEVEL" and the second is empty
    targetlumiColumns = targetlumiRow.length - 2;
    for (var i = 2; i < targetlumiRow.length; i++)
      if (targetlumiRow[i].toString() == '') {
        // stop reading at this column
        targetlumiColumns = i - 2;
        break;
      }
  }

  // TODO: add checks for consistency among the number of columns

  var columns = Math.max(prescaleColumns, targetlumiColumns);
  if (commentRow) {
    text += Utilities.formatString('%-60s', '**');
    for (var i = 0; i < columns; i++)
      text += Utilities.formatString('%10s', commentRow[i+2].toString());
    text += '\n';
  }
  text += Utilities.formatString('%-60s', 'PRESCALE_INDEX');
  for (var i = 0; i < columns; i++)
    text += Utilities.formatString('%10s', prescaleRow[i+2].toString());
  text += '\n';
  text += Utilities.formatString('%-60s', 'TARGET_LUMI_LEVEL');
  for (var i = 0; i < columns; i++)
    text += Utilities.formatString('%10s', targetlumiRow[i+2].toString());
  text += '\n';

  // add an empty line
  text += '\n';

  // look for the Algo trigger bits
  for (var i = 0; i < 128; i++) {
    var bit = 'a' + i;
    var bitRow = findRowForEntry(data, bit);
    if (bitRow) {
      // comvert empty trigger names to a single dash
      if (bitRow[1] == '')
        text += Utilities.formatString('%-6s%-54s', bit, '-');
      else
        text += Utilities.formatString('%-6s%-54s', bit, bitRow[1]);
      var j = 0;
      while (j < Math.min(columns, bitRow.length - 2)) {
        // convert values to strings and remove whitespace
        text += Utilities.formatString('%10s', cleanupValue(bitRow[j+2]));
        j++;
      }
      while (j < columns) {
        text += Utilities.formatString('%10s', '1');
        j++;
      }
    } else {
      // fill in missing bits
      text += Utilities.formatString('%-6s%-54s', bit, '-');
      var j = 0;
      while (j < columns) {
        text += Utilities.formatString('%10s', '1');
        j++;
      }
    }
    text += '\n';
  }

  // add an empty line
  text += '\n';

  // look for the Tech trigger bits
  for (var i = 0; i < 64; i++) {
    var bit = 't' + i;
    var bitRow = findRowForEntry(data, bit);
    if (bitRow) {
      text += Utilities.formatString('%-6s%-54s', bit, bitRow[1]);
      var j = 0;
      while (j < Math.min(columns, bitRow.length - 2)) {
        text += Utilities.formatString('%10s', bitRow[j+2].toString());
        j++;
      }
      while (j < columns) {
        text += Utilities.formatString('%10s', '1');
        Logger.log(j + '\t' + '1');
        j++;
      }
    } else {
      text += Utilities.formatString('%-6s%-54s', bit, '-');
      var j = 0;
      while (j < columns) {
        text += Utilities.formatString('%10s', '1');
        j++;
      }
    }
    text += '\n';
  }

  return text;
}

var l1textComment = "*******************************************************************************\n\
* Comments - indicated by * - and blank lines are ignored\n\
*\n\
* Notes:\n\
*   the DESCRIPTION field is optional\n\
*   the LUMINOSITY_NOMINAL_HZ_CM2 field is optional, and is 1e+30 by default\n\
*   the PRESCALE_INDEX values should count from 0\n\
*   the TARGET_LUMI_LEVEL valeus are % relative to LUMINOSITY_NOMINAL_HZ_CM2\n\
*\n\
*   parsing will fail if\n\
*     - PRESCALE_INDEX or TARGET_LUMI_LEVEL are written wrong\n\
*     - any trigger name is left empty (use a singl dash, \"-\", for unused trigger bits)\n\
*\n\
*   the limits from the prescales are\n\
*     - algo bits a0...a7:   1048575\n\
*     - algo bits a8...a127:  262143\n\
*     - tech bits:             65535\n\
*\n\
*******************************************************************************\n\
";
