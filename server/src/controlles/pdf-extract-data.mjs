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

            console.log(elemento.attributes)

            const inputDetail = {
                "dataId": elemento.attributes.dataId,
                "seccion": elemento.attributes["aria-label"],
                "value": elemento.attributes.value,
                "hubspotProperty": ""
            }

            resultados.push(inputDetail);
        }

        //if(elemento.attributes["aria-label"].includes("citizen")){ console.log(elemento.attributes)}
        
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
    const pdf = await pdfjs.getDocument({ url: "./src/InputFiles/pdfsLlenos/" + pdfInput, enableXfa: true });

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
                fs.writeFile("./src/OutputFiles/FormInputs/" + fileNameWithoutExtension + ".json", JSON.stringify( xfa), 'utf-8', (err) => {
                    if (err) {
                        console.error('Error writing JSON file:', err);
                    } else {
                        console.log('JSON file has been written successfully!');
                    }
                })
            } catch (e) {
                console.log(e)
            }
        } else {
            console.log("El pdf " + pdfInput + " no es un xfa")
            // Get the AcroForm (fillable form) fields
            await pdfdata.getFieldObjects().then(async inputs => {

                let jsonFields = [];

                for (let input in inputs) {
                    console.log("dfgfdg", inputs[input])

                    let campo = {
                        "dataId": inputs[input][0].id,
                        "seccion": inputs[input][0].name,
                        "hubspotProperty": ""
                    }

                    jsonFields.push(campo);
                }

                //console.log(jsonFields)

                jsonFields = JSON.stringify(jsonFields)

                try {
                    fs.writeFile("./src/OutputFiles/FormInputs/" + pdfInput + ".json", jsonFields, 'utf-8', (err) => {
                        if (err) {
                            console.error('Error writing JSON file:', err);
                        } else {
                            console.log('JSON file has been written successfully!');
                        }
                    })
                } catch (e) {
                    console.log(e)
                }

                // Guardar PDF.
                try {
                    const folder = "./src/OutputFiles/NoXfa"

                    const newpdf = await pdfdata.saveDocument();
                    const outputPath = path.join(folder, pdfInput);
                    await fs.promises.writeFile(outputPath, Buffer.from(newpdf));
                    console.log("PDF saved successfully!");
                } catch (writeError) {
                    console.error("Error writing PDF:", writeError);
                }
            })
        }
    })
}

const extractData = async (req, res) => {

    try {

        const files = await fs.promises.readdir('./src/InputFiles/pdfsLlenos');

        const processingPromises = [];

        console.log("cantidad de archivos: " + files.length)

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

export default extractData;