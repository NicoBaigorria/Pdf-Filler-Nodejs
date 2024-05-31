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
  const resultados = {};

  /**
   * Fucion para buscar campos.
   *
   * @param {Object} elemento - Xfa para revisar.
   */
  function buscarRecursivamente(elemento) {
    if (elemento.name === targetName) {
      let inputDetail = {};
      const dataId = elemento.attributes.dataId;

      if (targetName == "select") {
        inputDetail = {
          seccion: elemento.attributes["aria-label"],
          hubspotProperty: "",
          options: Array.from(elemento.children).map((option) => option.value),
        };
      } else {
        inputDetail = {
          seccion: elemento.attributes["aria-label"],
          hubspotProperty: "",
        };
      }

      resultados[dataId] = inputDetail;
    }

    if (elemento.children && elemento.children.length > 0) {
      for (const child of elemento.children) {
        buscarRecursivamente(child);
      }
    }
  }

  buscarRecursivamente(json);

  return resultados;
}

const procesarPdf = async (pdfInput) => {
  const pdf = await pdfjs.getDocument({
    url: "./src/InputFiles/" + pdfInput,
    enableXfa: true,
  });

  await pdf.promise.then(async function (pdfdata) {
    console.log("PDF loaded");

    const xfa = pdfdata.allXfaHtml;

    if (xfa) {
      // Extraer todos los campos para rellenar.
      const resultadoSelect = buscarPropiedad(xfa, "select");
      const resultadoInput = buscarPropiedad(xfa, "input");
      const resultadotextarea = buscarPropiedad(xfa, "textarea");

      const pdfInputStructure = {
        select: resultadoSelect,
        input: resultadoInput,
        textarea: resultadotextarea,
      };

      const jsonString = JSON.stringify(pdfInputStructure);

      const fileNameWithoutExtension = path.parse(pdfInput).name;

      try {
        fs.writeFile(
          "./src/OutputFiles/FormInputs/" + fileNameWithoutExtension + ".json",
          jsonString,
          "utf-8",
          (err) => {
            if (err) {
              console.error("Error writing JSON file:", err);
            } else {
              console.log("JSON file has been written successfully!");
            }
          }
        );
      } catch (e) {
        console.log(e);
      }
    } else {
      console.log("El pdf " + pdfInput + " no es un xfa");
      // Get the AcroForm (fillable form) fields
      await pdfdata.getFieldObjects().then(async (inputs) => {
        let jsonFields = {};

        for (let input in inputs) {
          console.log("dfgfdg", inputs[input]);

          let campo = {};

          const id = inputs[input][0].id;

          if (inputs[input][0].type == "combobox") {
            campo = {
              seccion: inputs[input][0].name,
              hubspotProperty: "",
              options: inputs[input][0].items,
            };
          } else {
            campo = {
              seccion: inputs[input][0].name,
              hubspotProperty: "",
            };
          }

          jsonFields[id] = campo;
        }

        //console.log(jsonFields)

        jsonFields = JSON.stringify(jsonFields);

        const fileNameWithoutExtension = path.parse(pdfInput).name;

        try {
          fs.writeFile(
            "./src/OutputFiles/FormInputs/" +
              fileNameWithoutExtension +
              ".json",
            jsonFields,
            "utf-8",
            (err) => {
              if (err) {
                console.error("Error writing JSON file:", err);
              } else {
                console.log("JSON file has been written successfully!");
              }
            }
          );
        } catch (e) {
          console.log(e);
        }
      });
    }
  });
};

const getEstructura = async (req, res) => {
  try {
    const files = await fs.promises.readdir("./src/InputFiles");

    const processingPromises = [];

    console.log("cantidad de archivos: " + files.length);

    for (const file of files) {
      const processingPromise = procesarPdf(file);
      processingPromises.push(processingPromise);
    }

    await Promise.all(processingPromises);

    res.status(200);
    res.send("result");
  } catch (e) {}
};

export default getEstructura;
