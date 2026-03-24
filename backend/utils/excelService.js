const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

/**
 * Save responses to an Excel file
 * @param {string} departmentName - Department name
 * @param {Array} questions - Array of question strings
 * @param {Array} answers - Array of answers submitted by user
 */
const saveResponsesToExcel = (departmentName, questions, answers) => {
  try {
    // Create worksheet data
    const data = questions.map((q, index) => ({
      Question: q,
      Answer: answers[index] || "",
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    XLSX.utils.book_append_sheet(wb, ws, "Responses");

    // Ensure folder exists
    const dir = path.join(__dirname, "../responses");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    // Filename with timestamp
    const filePath = path.join(
      dir,
      `${departmentName.replace(/\s+/g, "_")}_responses.xlsx`
    );

    // Write file
    XLSX.writeFile(wb, filePath);

    console.log("Responses saved to Excel ", filePath);
    return filePath;
  } catch (err) {
    console.error("Error saving responses to Excel", err);
    throw err;
  }
};

module.exports = { saveResponsesToExcel };