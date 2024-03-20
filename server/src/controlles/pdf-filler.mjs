/**
 * @module PdfProcessing
 */

import fs from "fs";
import path from "path";
import * as pdfjs from "pdfjs-dist/build/pdf.min.mjs";
import {
  getTicket,
  createFolder,
  createFile,
  deleteFolder,
  updateProperty,
} from "../services/hubspot.mjs";
import internal from "stream";

/**
 * Procesar lista de campos busca su equivalente en hubspot y lo rellena.
 *
 * @param {Object} objeto - Lista de campos que se va a procesar.
 * @param {Object} pdfdata - La información del PDF.
 * @param {Object} matchPropiedades - Las propiedades de coincidencia para buscar.
 * @param {Object} ticketProperties - Las propiedades del ticket para obtener los valores.
 * @returns {Promise<void>} - Una promesa que se resuelve cuando se completa el procesamiento.
 */
async function procesarCampo(
  pdfdata,
  matchPropiedades,
  ticketProperties,
  logs
) {
  for (let tipo in matchPropiedades) {
    for (let campo in matchPropiedades[tipo]) {
      const InternalName = matchPropiedades[tipo][campo].hubspotProperty;
      const value = ticketProperties[InternalName];
      //  console.log("familyname", ticketProperties.familyname)
      //  if (logs) console.log("campo: " + campo + " llenado con " + value);
      try {
        if (value) await pdfdata.annotationStorage.setValue(campo, { value: value });
      } catch (e) {
        console.log("Error al llenar campo: " + campo);
      }
    }
  }
}

/**
 * Procesar pdf para rellenar.
 *
 * @param {string} pdfInput - Nombre del Pdf.
 * @param {string} folder - Url de salida del Pdf.
 * @param {Object} ticketProperties - Propiedades de Ticket.
 * @returns {Promise<void>} - Promesa de que el archivo sera escrito.
 */
const procesarPdf = async (pdfInput, folder, ticketProperties) => {
  try {
    const pdf = await pdfjs.getDocument({
      url: "./src/InputFiles/" + pdfInput,
      enableXfa: true,
    });

    await pdf.promise.then(async function (pdfdata) {
      console.log("PDF loaded: " + pdfInput);

      const xfa = await pdfdata.allXfaHtml;
      //-----------------SI NO ES XFA------------------
      if (xfa) {
        const fileNameWithoutExtension = path.parse(pdfInput).name;

        console.log(
          "qweqwe",
          "./src/Jsons/matchPropsForms/" + fileNameWithoutExtension + ".json"
        );

        const matchPropiedades = await JSON.parse(
          fs.readFileSync(
            "./src/Jsons/matchPropsForms/" + fileNameWithoutExtension + ".json",
            "utf8"
          )
        );

        let logs = false;

        if (fileNameWithoutExtension == "imm1294e") logs = true;

        try {
          // Esperar a que todas las promesas se resuelvan
          await procesarCampo(
            pdfdata,
            matchPropiedades,
            ticketProperties,
            logs
          ).then(async () => {
            try {
              // Guardar PDF.
              if (fileNameWithoutExtension == "imm1294e") console.log("fghgfhgf", await pdfdata.annotationStorage.getAll());
              await pdfdata.saveDocument().then(async (newpdf) => {
                const outputPath = path.join(folder, pdfInput);
                await fs.promises.writeFile(outputPath, Buffer.from(newpdf)).then(async () => {
                  if (fileNameWithoutExtension == "imm1294e") {
                    try {
                      const pdff = await pdfjs.getDocument({
                        url: outputPath,
                        enableXfa: true,
                      });

                      await pdff.promise.then(async function (pdfdataa) {
                        console.log("cvbcvbcv", await pdfdataa.annotationStorage.getAll());
                      })
                    } catch (e) {
                      console.log(e)
                    }
                  }
                });
                console.log("PDF saved successfully!");
              });

            } catch (err) {
              console.log("PDF Error!", err);
            }
          });
        } catch (error) {
          console.error("Error:", error);
        }
      } else {
        //-----------------SI NO ES UN XFA------------------
        console.log("Not have xfa " + pdfInput);

        // Get the AcroForm (fillable form) fields
        await pdfdata.getFieldObjects().then(async (inputs) => {
          for (let input in inputs) {
            if (inputs[input][0].type == "text") {
              await pdfdata.annotationStorage.setValue(inputs[input][0].id, {
                value: "value",
              });
            }
          }
        });

        // Guardar PDF.
        try {
          const newpdf = await pdfdata.saveDocument();
          const outputPath = path.join(folder, pdfInput);
          await fs.promises.writeFile(outputPath, Buffer.from(newpdf));
          console.log("PDF saved successfully!" + pdfInput);
        } catch (writeError) {
          console.error("Error writing PDF:", writeError);
        }
      }

      // Close the PDF document
      await pdfdata.destroy();
    });
  } catch (error) {
    console.log("ERROR READING PDF: " + pdfInput);
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

    // Traer informacion del ticket para llenar formularios

    const ticketData = await getTicket(idTicket);
    const ticketProperties = ticketData.properties;

    console.log(ticketProperties);

    // Selecciono los Formularios segun el plan

    const listaProgramas = await JSON.parse(
      fs.readFileSync("./src/Jsons/planesForm.json", "utf8")
    );

    const programa = ticketProperties.programa_formularios;

    const files = await fs.promises.readdir("./src/InputFiles");

    if (listaProgramas.hasOwnProperty(programa)) {
      listaProgramas = listaProgramas.filter(function (elemento) {
        return listaProgramas.programa.includes(elemento);
      });
    }

    const processingPromises = [];

    // Procesar, llenar cada PDF y guardarlo en una carpeta dentro de la app.

    //reemplazar files por listaProgramas

    for (const file of files) {
      const processingPromise = procesarPdf(file, folder, ticketProperties);
      processingPromises.push(processingPromise);
    }

    await Promise.all(processingPromises);

    // Borrar carpeta en Hubpsot si existe.
    await deleteFolder(ticketProperties.id_folder);

    // Crear una carpeta en Hubspot.

    const folderId = await createFolder(idTicket);
    console.log(folderId);

    const jsonPropsTicket = {
      id_folder: folderId,
    };

    // Actualizar propiedad folder_id del Ticket.
    await updateProperty(idTicket, jsonPropsTicket);

    // Subir los PDFs a la nueva carpeta.
    const pdfsListos = await fs.promises.readdir(folder);

    const uploadPromises = pdfsListos.map(async (file) => {
      await createFile(folder, file, folderId);
    });
    await Promise.all(uploadPromises);

    // Borrar carpeta en la app.

    //await fs.promises.rmdir(folder, { recursive: true });

    res.send("PDF generated and saved successfully!");
  } catch (postPdfError) {
    console.error("Error in postPdf:", postPdfError);
    res.status(500).send("Internal Server Error");
  }
};

export default postPdf;
