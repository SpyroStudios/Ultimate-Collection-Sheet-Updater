/**
 * @OnlyCurrentDoc
 * Required scopes:
 * https://www.googleapis.com/auth/drive.readonly
 * or 
 * https://www.googleapis.com/auth/drive
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

function getDriveFiles() {
  var files = [];
  var query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  var fileIterator = DriveApp.searchFiles(query);

  while (fileIterator.hasNext()) {
    var file = fileIterator.next();
    files.push({ name: file.getName(), id: file.getId() });
  }

  return files;
}

function copySpreadsheet(sheetID) {
  try {
    const templateFileId = '1XaK_leV_uys-zLWhW03MP921S-cJiXGAxCqN8vWkHtc'; //V 1.0.1
    const sourceSpreadsheetId = sheetID;
    
    // Get the template file and make a copy
    const file = DriveApp.getFileById(templateFileId);
    const newFile = file.makeCopy("The Ultimate Skylanders Collectors Sheet v1.0.1 (Processed at " + new Date().toLocaleString() + ")");
    const newSpreadsheet = SpreadsheetApp.openById(newFile.getId());
    const sourceSpreadsheet = SpreadsheetApp.openById(sourceSpreadsheetId);

    // Sheet configuration: sheet names and columns to update
    const sheetConfig = {
      "Spyro's Adventure": [7, 8, 9],
      "Giants": [7, 8, 9],
      "Swap Force": [7, 8, 9],
      "Trap Team": [7, 8, 9],
      "Superchargers": [7, 8, 9],
      "Imaginators": [8, 9, 10],
      "Eon's Elite": [7, 8, 9],
      "Traps": [7, 8, 9],
      "Vehicles": [7, 8, 9],
      "Creation Crystals": [7, 8, 9],
      "Chase Variants": [7, 8, 9],
      "Extras": [4, 5], // Specific columns for "Extras"
    };

    // Iterate through sheets
    for (const [sheetName, columns] of Object.entries(sheetConfig)) {
      const sourceSheet = sourceSpreadsheet.getSheetByName(sheetName);
      const targetSheet = newSpreadsheet.getSheetByName(sheetName);

      if (sourceSheet && targetSheet) {
        Logger.log(`Processing sheet: ${sheetName}`);

        // Get the total number of rows in the source sheet
        let numRows = sourceSheet.getLastRow();

        // Exclude the last two rows for "Traps" and "Vehicles"
        if (sheetName === "Traps" || sheetName === "Vehicles") {
          numRows = Math.max(2, numRows - 2); // Ensure at least one row remains
        }

        for (let i = 2; i <= numRows; i++) {
          try {
            // Fetch and update specific columns for "Extras"
            if (sheetName === "Extras") {
              const rowValues = sourceSheet.getRange(i, 4, 1, 2).getValues()[0]; // Columns 4 and 5
              targetSheet.getRange(i, 4, 1, rowValues.length).setValues([rowValues]); // Update only columns 4 and 5
            } else {
              // Fetch values for the specified columns
              const rowValues = columns.map(colIndex => sourceSheet.getRange(i, colIndex + 1).getValue());
              targetSheet.getRange(i, columns[0] + 1, 1, rowValues.length).setValues([rowValues]); // Update respective columns
            }
          } catch (rowError) {
            Logger.log(`Error processing row ${i} in sheet "${sheetName}": ${rowError.message}`);
          }
        }

        Logger.log(`Data updated in target sheet: ${sheetName}`);
      } else {
        Logger.log(`Source sheet or target sheet not found: ${sheetName}`);
      }
    }

    // Return URL of the new spreadsheet
    return newSpreadsheet.getUrl();

  } catch (error) {
    Logger.log("Error in copySpreadsheet: " + error.message);
    throw new Error("Failed to process the spreadsheet: " + error.message);
  }
}

function validateSpreadsheet(fileId, requiredSheets) {
  const spreadsheet = SpreadsheetApp.openById(fileId);
  const existingSheets = spreadsheet.getSheets().map(sheet => sheet.getName());
  const missingSheets = requiredSheets.filter(sheet => !existingSheets.includes(sheet));

  return {
    isValid: missingSheets.length === 0,
    missingSheets: missingSheets
  };
}


// Function to copy images from the source to target sheet
function copyImages(sourceSheet, targetSheet) {
  const images = sourceSheet.getImages();
  images.forEach(function(image) {
    targetSheet.insertImage(image.getBlob(), image.getAnchorCell().getColumn(), image.getAnchorCell().getRow());
  });
}
