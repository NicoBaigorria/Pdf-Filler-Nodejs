import fs from "fs";
import * as pdfjs from "pdfjs-dist/build/pdf.min.mjs";

async function readAndEditXFAWithAnnotations(pdfInputPath, outputPath, newData) {
    try {
        const pdf = await pdfjs.getDocument({ url: pdfInputPath, enableXfa: true });
        const pdfData = await pdf.promise;

        // Access XFA form data
        const xfaData = await pdfData.getData();

        console.log("Data IDs of XFA fields:", xfaData);
        

        // Modify the data or annotations as needed
        // For example, update field values with newData
        for (const fieldName in newData) {
            console.log(fieldName, newData[fieldName])
            await pdfData.annotationStorage.setValue(fieldName, { value: newData[fieldName] });
        }

        // Save the modified PDF document
        const modifiedPdfBytes = await pdfData.saveDocument();
        await saveModifiedPdf(outputPath, modifiedPdfBytes);

        console.log("PDF saved successfully with updated XFA data and annotations.");
    } catch (error) {
        console.error("Error reading or editing PDF:", error);
    }
}

async function saveModifiedPdf(outputPath, modifiedPdfBytes) {
    try {
        const arrayBuffer = new Uint8Array(modifiedPdfBytes).buffer;
        await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));
    } catch (error) {
        console.error("Error saving modified PDF:", error);
    }
}

// Usage example:
const pdfInputPath = "./src/InputFiles/imm1294e.pdf";
const outputPath = "./imm1294e.pdf";
const newData = {
    "Sex240558": "M Male",
    "FamilyName240550": "Tomas",
    // Add more field data as needed
};

readAndEditXFAWithAnnotations(pdfInputPath, outputPath, newData);
