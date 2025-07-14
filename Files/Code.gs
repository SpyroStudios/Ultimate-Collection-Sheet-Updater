/**
 * Required scopes:
 * https://www.googleapis.com/auth/drive.readonly
 * or 
 * https://www.googleapis.com/auth/drive
 * or
 * https://www.googleapis.com/auth/spreadsheets
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
    const templateFileId = '17y7-4SXasf5KaddW7-pBrobtZZLfdNX9-F8rztFxMI4'; //v1.1.4
    const sourceSpreadsheetId = sheetID;

    const file = DriveApp.getFileById(templateFileId);
    const newFile = file.makeCopy("The Ultimate Skylanders Collectors Sheet v1.1.4 (Updated on " + new Date().toLocaleDateString() + ")");

    const editors = newFile.getEditors();
    const viewers = newFile.getViewers();

    editors.forEach(user => newFile.removeEditor(user));
    viewers.forEach(user => newFile.removeViewer(user));

    const newSpreadsheet = SpreadsheetApp.openById(newFile.getId());
    const sourceSpreadsheet = SpreadsheetApp.openById(sourceSpreadsheetId);

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
      "Extras": [4, 5],
    };

    const swapForceValidJRowRanges = [
      [4, 5], [11, 12], [18, 19], [25, 26], [32, 33], [39, 40],
      [46, 47], [53, 54], [60, 61], [65, 66], [69, 71], [73, 74]
    ];

    const isInSwapForceSpecialRange = (row) =>
      swapForceValidJRowRanges.some(([start, end]) => row >= start && row <= end);

    const isPositiveInteger = (val) =>
      typeof val === 'number' && Number.isInteger(val) && val > 0;

    const isPositiveIntegerOrHalf = (val) =>
      typeof val === 'number' && val > 0 && (val % 1 === 0 || val % 1 === 0.5);

    let sheetsFoundCount = 0;

    for (const [sheetName, columns] of Object.entries(sheetConfig)) {
      const sourceSheet = sourceSpreadsheet.getSheetByName(sheetName);
      const targetSheet = newSpreadsheet.getSheetByName(sheetName);

      if (!sourceSheet || !targetSheet) {
        Logger.log(`Skipping sheet (not found): ${sheetName}`);
        continue;
      }

      sheetsFoundCount++;
      Logger.log(`Processing sheet: ${sheetName}`);

      let numRows = sourceSheet.getLastRow();
      const maxCols = Math.min(sourceSheet.getMaxColumns(), targetSheet.getMaxColumns());

      const checkboxCol1 = (sheetName === "Imaginators") ? 13 : 12;
      const checkboxCol2 = (sheetName === "Imaginators") ? 14 : 13;
      const hasCheckboxCols = maxCols >= checkboxCol2;

      if (sheetName === "Traps" || sheetName === "Vehicles") {
        numRows = Math.max(2, numRows - 2);
      }

      for (let i = 4; i <= numRows; i++) {
        try {
          if (sheetName === "Extras") {
            let rowValues = sourceSheet.getRange(i, 4, 1, 2).getValues()[0];
            rowValues = rowValues.map(val => typeof val === 'boolean' ? val : '');
            targetSheet.getRange(i, 4, 1, rowValues.length).setValues([rowValues]);
            continue;
          }

          let rowValues = columns.map(colIndex =>
            sourceSheet.getRange(i, colIndex + 1).getValue()
          ).map(val => typeof val === 'boolean' ? val : '');

          const duplicateCol = (sheetName === "Imaginators") ? 11 : 10;
          let duplicateVal = '';
          const rawVal = sourceSheet.getRange(i, duplicateCol).getValue();

          if (sheetName === "Swap Force") {
            if (
              (isInSwapForceSpecialRange(i) && isPositiveIntegerOrHalf(rawVal)) ||
              (!isInSwapForceSpecialRange(i) && isPositiveInteger(rawVal))
            ) {
              duplicateVal = rawVal;
            }
          } else if (
            (sheetName === "Imaginators" && isPositiveInteger(rawVal)) ||
            (sheetName !== "Extras" && isPositiveInteger(rawVal))
          ) {
            duplicateVal = rawVal;
          }

          targetSheet.getRange(i, columns[0] + 1, 1, rowValues.length).setValues([rowValues]);
          targetSheet.getRange(i, duplicateCol, 1, 1).setValue(duplicateVal);

          if (hasCheckboxCols) {
            let checkbox1 = sourceSheet.getRange(i, checkboxCol1).getValue();
            let checkbox2 = sourceSheet.getRange(i, checkboxCol2).getValue();

            checkbox1 = (checkbox1 === true || checkbox1 === false) ? checkbox1 : '';
            checkbox2 = (checkbox2 === true || checkbox2 === false) ? checkbox2 : '';

            targetSheet.getRange(i, checkboxCol1, 1, 1).setValue(checkbox1);
            targetSheet.getRange(i, checkboxCol2, 1, 1).setValue(checkbox2);
          }

        } catch (rowError) {
          Logger.log(`Error processing row ${i} in "${sheetName}": ${rowError.message}`);
        }
      }

      Logger.log(`Finished processing: ${sheetName}`);
    }

    try {
      const sourceSheet = sourceSpreadsheet.getSheetByName("Completion");
      const targetSheet = newSpreadsheet.getSheetByName("Completion");

      if (sourceSheet && targetSheet) {
        const sourceValues = sourceSheet.getRange("A8:A12").getValues();
        const processedValues = sourceValues.map(([val]) => [val === true]);
        targetSheet.getRange("A8:A12").setValues(processedValues);
        Logger.log("Completion sheet copied.");
      } else {
        Logger.log("Skipping Completion (not found).");
      }
    } catch (completionError) {
      Logger.log("Completion sheet error: " + completionError.message);
    }

    if (sheetsFoundCount === 0) {
      throw new Error("No configured sheets found in the source spreadsheet.");
    }

    return newSpreadsheet.getUrl();

  } catch (error) {
    Logger.log("Error in copySpreadsheet: " + error.message);
    throw new Error("Failed to process the spreadsheet: " + error.message);
  }
}


function validateSpreadsheet(fileId, requiredSheets) {
  try {
    const spreadsheet = SpreadsheetApp.openById(fileId);
    const existingSheets = spreadsheet.getSheets().map(sheet => sheet.getName());
    
    //find which required sheets exist in the spreadsheet
    const existingRequiredSheets = requiredSheets.filter(sheet => existingSheets.includes(sheet));
    
    return {
      isValid: existingRequiredSheets.length > 0,  // true if at least one exists
      existingSheets: existingRequiredSheets,
      missingSheets: requiredSheets.filter(sheet => !existingSheets.includes(sheet))
    };
  } catch (error) {
    throw new Error("Could not open or read the spreadsheet: " + error.message);
  }
}

//copy images from the source to target sheet
function copyImages(sourceSheet, targetSheet) {
  const images = sourceSheet.getImages();
  images.forEach(function(image) {
    targetSheet.insertImage(image.getBlob(), image.getAnchorCell().getColumn(), image.getAnchorCell().getRow());
  });
}
