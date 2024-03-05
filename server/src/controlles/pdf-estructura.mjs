import fs from "fs";
import path from "path";
import * as pdfjs from "pdfjs-dist/build/pdf.min.mjs";


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

            const inputDetail = {
                "dataId": elemento.attributes.dataId,
                "seccion": elemento.attributes["aria-label"]
            }

            resultados.push(inputDetail);
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

const procesarPdf = async (pdfInput) => {
    const pdf = await pdfjs.getDocument({ url: "./src/InputFiles/" + pdfInput, enableXfa: true });

    await pdf.promise.then(async function (pdfdata) {
        console.log("PDF loaded");

        const xfa = pdfdata.allXfaHtml;

        if (xfa) {
            // Extraer todos los campos para rellenar.
            const resultadoSelect = buscarPropiedad(xfa, "select");
            const resultadoInput = buscarPropiedad(xfa, "input");
            const resultadotextarea = buscarPropiedad(xfa, "textarea");

            const pdfInputStructure = {
                "selects": resultadoSelect,
                "inputs": resultadoInput,
                "textareas": resultadotextarea
            }

            const jsonString = JSON.stringify(pdfInputStructure);

            const fileNameWithoutExtension = path.parse(pdfInput).name;

            console.log(fileNameWithoutExtension)

            try {
                fs.writeFile("./src/OutputFiles/FormInputs/" + fileNameWithoutExtension + ".json", jsonString, 'utf-8', (err) => {
                    if (err) {
                      console.error('Error writing JSON file:', err);
                    } else {
                      console.log('JSON file has been written successfully!');
                    }
                })
            } catch (e) {
                console.log(e)
            }
        }
    })
}

const getEstructura = async (req, res) => {

    try {

        const files = await fs.promises.readdir('./src/InputFiles');

        const processingPromises = [];

        for (const file of files) {
            const processingPromise = procesarPdf(file);
            processingPromises.push(processingPromise);
        }

        await Promise.all(processingPromises)

        res.status(200);
        res.send("result");
    } catch (e) {

    }
}

export default getEstructura;