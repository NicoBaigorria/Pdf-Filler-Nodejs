/**
 * @module PdfProcessing
 */

import fs from "fs";
import path from "path";
import * as pdfjs from "pdfjs-dist/build/pdf.min.mjs";
import { getTicket, createFolder, createFile, deleteFolder, updateProperty } from "../services/hubspot.mjs";

/**
 * Mapea el xfa y devuelve la lista de campos que coincidan con el tipo del segundo parametro.
 *
 * @param {Object} json - The JSON object to search.
 * @param {string} targetName - Tipo de campo.
 * @returns {Array|null} - Lista de campos
 * .
 */
function buscarPropiedad(json, targetName) {
  const resultados = [];

  /**
   * Fucion para buscar campos.
   *
   * @param {Object} elemento - Xfa para revisar.
   */
  function buscarRecursivamente(elemento) {
    if (elemento.name === targetName) {
      resultados.push(elemento.attributes.dataId);
    }

    if (elemento.children && elemento.children.length > 0) {
      for (const child of elemento.children) {
        buscarRecursivamente(child);
      }
    }
  }

  buscarRecursivamente(json);

  return resultados.length > 0 ? resultados : null;
}

/**
 * Procesar lista de campos busca su equivalente en hubspot y lo rellena.
 *
 * @param {Object} objeto - Lista de campos que se va a procesar.
 * @param {Object} pdfdata - La información del PDF.
 * @param {Object} matchPropiedades - Las propiedades de coincidencia para buscar.
 * @param {Object} tickeProperties - Las propiedades del ticket para obtener los valores.
 * @returns {Promise<void>} - Una promesa que se resuelve cuando se completa el procesamiento.
 */
async function procesarCampo(objeto, pdfdata, matchPropiedades, tickeProperties) {
  for (let campo in objeto) {
    for (let property in matchPropiedades) {
      if (objeto[campo].includes(property)) {
        const InternalName = matchPropiedades[property].internalName;
        const value = tickeProperties[InternalName];
        console.log(objeto[campo] + " contains: " + property + " value: " + value);
        await pdfdata.annotationStorage.setValue(objeto[campo], { value: value });
      }
    }
  }
}


/**
 * Procesar pdf para rellenar.
 *
 * @param {string} pdfInput - Nombre del Pdf.
 * @param {string} folder - Url de salida del Pdf.
 * @param {Object} tickeProperties - Propiedades de Ticket.
 * @returns {Promise<void>} - Promesa de que el archivo sera escrito.
 */
const procesarPdf = async (pdfInput, folder, tickeProperties) => {
  try {
    const pdf = await pdfjs.getDocument({ url: "./src/InputFiles/" + pdfInput, enableXfa: true });

    await pdf.promise.then(async function (pdfdata) {
      console.log("PDF loaded");

      const xfa = pdfdata.allXfaHtml;

      if (xfa) {
        // Extraer todos los campos para rellenar.
        const resultadoSelect = buscarPropiedad(xfa, "select");
        const resultadoInput = buscarPropiedad(xfa, "input");
        const resultadotextarea = buscarPropiedad(xfa, "textarea");

        const matchPropiedades = await JSON.parse(fs.readFileSync("./src/Jsons/matchPropiedades.json", "utf8"));

        // Rellenar campos con datos de Hubpost.
        await procesarCampo(resultadotextarea, pdfdata, matchPropiedades, tickeProperties);
        await procesarCampo(resultadoInput, pdfdata, matchPropiedades, tickeProperties);
        await procesarCampo(resultadoSelect, pdfdata, matchPropiedades, tickeProperties);

        // Guardar PDF.
        try {
          const newpdf = await pdfdata.saveDocument();
          const outputPath = path.join(folder, pdfInput);
          await fs.promises.writeFile(outputPath, Buffer.from(newpdf));
          console.log("PDF saved successfully!");
        } catch (writeError) {
          console.error("Error writing PDF:", writeError);
        }
      } else {
        console.log("Not have xfa");
      }

        // Close the PDF document
  await pdfdata.destroy();
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};

/**
 * Process a POST request to generate and save PDF files.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A Promise that resolves when the PDF processing and saving is complete.
 */
const postPdf = async (req, res) => {
  try {
    console.log(req.body.objectId);

    const idTicket = req.body.objectId;
    const folder = "./src/OutputFiles/Pdf/" + idTicket;

    if (!fs.existsSync(folder)) {
      await fs.mkdirSync(folder, { recursive: true });
    }

    const ticketData = await getTicket(idTicket);
    const tickeProperties = ticketData.properties;

    console.log(tickeProperties);

    const files = await fs.promises.readdir('./src/InputFiles');
    const processingPromises = [];

    // Procesar, llenar cada PDF y guardarlo en una carpeta dentro de la app.
  
    for (const file of files) {
      const processingPromise = procesarPdf(file, folder, tickeProperties);
      processingPromises.push(processingPromise);
    }

    await Promise.all(processingPromises);


    // Borrar carpeta en Hubpsot si existe.
    await deleteFolder(tickeProperties.id_folder);


    // Crear una carpeta en Hubspot.

    const folderId = await createFolder(idTicket);
    console.log(folderId);

    const jsonPropsTicket = {
      "id_folder": folderId
    };


    // Actualizar propiedad folder_id del Ticket.
    await updateProperty(idTicket, jsonPropsTicket);


    // Subir los PDFs a la nueva carpeta.
    const subirPdfs = await fs.promises.readdir(folder);

    const uploadPromises = subirPdfs.map(async file => {
      await createFile(folder, file, folderId);
    });
    await Promise.all(uploadPromises);

    // Borrar carpeta en la app.

    await fs.promises.rmdir(folder, { recursive: true });

    res.send("PDF generated and saved successfully!");
  } catch (postPdfError) {
    console.error("Error in postPdf:", postPdfError);
    res.status(500).send("Internal Server Error");
  }
};

export default postPdf;
