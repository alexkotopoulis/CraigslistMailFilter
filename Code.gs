/**
 * Script to periodically check new GMail messages for alerts from Craigslist. 
 * If mail has at least one link to a previously unknown CL listing, it is left as-is, otherwise it is 
 * tagged "cl_old" and deleted.
 */

// Maximum number of messages to process
var PAGE_SIZE = 150

// Pattern for Craigslist links
var CL_PATTERN = 'https://sfbay.craigslist.org/' 

// Search pattern for GMail inbox
var GMAIL_SEARCH = 'in:inbox from:"CL Search Alerts" is:unread -label:cl_processed -in:starred '

/** 
 * Set the trigger to filter mail in inbox every 10 minutes
 */
function setFilterTrigger() {
  ScriptApp
     .newTrigger('filterMail')
     .timeBased()
     .everyMinutes(10)
     .create();
}

/**
 * Filters all unread mail from sender "CL Search Alerts" that does not have label "cl_processed".
 * If mail has at least one link to a previously unknown CL listing, it is left as-is, otherwise it is 
 * tagged "cl_old" and deleted. 
 * Listing IDs that have been seen are kept in a Google Sheets named "Craigslist Alert Exclusions".
 * Example link:
 * https://sfbay.craigslist.org/pen/grd/d/burlingame-plant-pedestal/7571365801.html
 */

function filterMail() {
  var labelProcd = GmailApp.createLabel("cl_processed"); // Always create labels, no-op if already exists
  var labelOld= GmailApp.createLabel("cl_old");

  var threads = GmailApp.search(GMAIL_SEARCH, 0, PAGE_SIZE)

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t];
    var messages = thread.getMessages();

    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];
      var body = message.getBody();
      var subject = message.getSubject();
      Logger.log("T:"+t+" M:"+m+" Subject: "+subject);
      var resultMap = findCLLinks(body);
      var hasNewListings = checkListings(resultMap);
      thread.addLabel(labelProcd);
      if (! hasNewListings)
         thread.addLabel(labelOld);
    }
  }
}

/**
 * Searches for HTML links to CL listings in param body, returns String[] with all listing numbers.
 */
function findCLLinks(body) {
   var resultMap = new Map();
   var finished = false;
   var start = 0;
   while (! finished) {
      var pos = body.indexOf(CL_PATTERN, start);
    if (pos != -1) {
      var pos0 = pos;
      pos += CL_PATTERN.length;
      if (body.substring(pos, pos+6) != 'search') { // Check that URL is not a search URL in mail
        var pos2 = pos;
        for (var cnt = 0; cnt < 4; cnt++) { // Skip 4 slashes in URL to get to listing ID
          var pos2 = body.indexOf('/', pos2);
          if (pos2 == -1) {
            break;
          } else {
            pos2 += 1;
          }
        }
        if (pos2 != -1) {
          pos2 += 1;
          var pos3 = body.indexOf('.', pos2) // Position of . after listing ID in link
          if (pos3 != -1) {
            var listingNum = body.substring(pos2, pos3);
            var listingUrl = body.substring(pos0, pos3)+'.html';
            resultMap.set(listingNum,listingUrl);
            Logger.log("Listing ID:"+listingNum);
            pos3 += 1;
            start = pos3;
          }
        }
      } else {
        start = pos;
      }
    } else {
      finished = true
    }
  }
  return resultMap
}

/**
 * Check listings in sheet and return true if there is at least one new listing, false if all listings are old.
 * All new listings are added to the sheet
 */
function checkListings(map) {
  var sheet;
 var spreadsheetName = "Craigslist Alert Exclusions";
  var spreadsheetId = getIdFromName(spreadsheetName);
  var dateNow = new Date();
  var dateNowStr =  Utilities.formatDate(dateNow,
      'America/Los_Angeles', "MM/dd/yyyy hh:mm:ss"); 


  if (null != spreadsheetId) {
    doc = SpreadsheetApp.openById(spreadsheetId);
    sheet = doc.getActiveSheet();
  } else {
    doc = SpreadsheetApp.create(spreadsheetName);
    sheet = doc.getActiveSheet();
    sheet.getRange(1, 1).setValue("Date");
    sheet.getRange(1, 2).setValue("ListingID");
    sheet.getRange(1, 3).setValue("Num Hits");
    sheet.getRange(1, 4).setValue("URL");
  }

  var result = false

  for (let [key, value] of map) {
    var listingId=key;
    var listingCol = sheet.getRange("B1:B");
    var textFinder = listingCol.createTextFinder(listingId);
    var cell = textFinder.findNext();
    if (cell == null) { // notFound; insert new row at beginning
      sheet.insertRowAfter(1);
      sheet.getRange(2, 1).setValue(dateNowStr);
      sheet.getRange(2, 2).setValue(listingId);
      sheet.getRange(2, 3).setValue(1);
      sheet.getRange(2, 4).setValue(value);
      result = true;
    } else { // found
       var row = cell.getRow();
       var hits = sheet.getRange(row, 3).getValue();
       hits += 1;
       sheet.getRange(row, 3).setValue(hits);
       sheet.getRange(row, 1).setValue(dateNowStr);
    }
  }

    return result;
}

/**
 * Get Sheet ID from filename; pick first file if multiple have same name
 */
function getIdFromName(spreadsheetName) {
   var spreadsheetId = null;
  
  fileList = DriveApp.getFilesByName(spreadsheetName);
  while (fileList.hasNext()) {
    spreadsheetId=fileList.next().getId();
    return spreadsheetId;
  }
  
  return null;
}