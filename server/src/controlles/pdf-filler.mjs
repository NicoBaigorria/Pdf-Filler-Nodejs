import fs from "fs";
import path from "path";
import * as pdfjs from "pdfjs-dist/build/pdf.min.mjs";
import { getTicket, createFolder, createFile, deleteFolder } from "../services/hubspot.mjs";

function buscarPropiedad(json, targetName) {
  const resultados = [];

  function buscarRecursivamente(elemento) {
    if (elemento.name === targetName) {
      if (elemento.name === "select") {
        resultados.push(elemento.children);
      } else {
        resultados.push(elemento.attributes.dataId);
        elemento.attributes.textContent = "asdsad";
      }
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

const procesarPdf = async (pdfInput, folder) => {
  try {
    const pdf = await pdfjs.getDocument({ url: "./src/InputFiles/" + pdfInput, enableXfa: true });

    pdf.promise.then(async function (pdfdata) {
      console.log("PDF loaded");

      const xfa = pdfdata.allXfaHtml;

      if (xfa) {
        //console.log(xfa);

        // Busco Propiedades
        const resultadoSelect = buscarPropiedad(xfa, "select");
        console.log("Resultado para 'select':", resultadoSelect);

        const resultadoInput = buscarPropiedad(xfa, "input");
        console.log("Resultado para 'input':", resultadoInput);

        const resultadotextarea = buscarPropiedad(xfa, "textarea");
        console.log("Resultado para 'textarea':", resultadotextarea);

        // Relleno campos
        pdfdata.annotationStorage.setValue("FamilyName31585", { value: "asdsadas" });
        pdfdata.annotationStorage.setValue("Sex31593", { value: "Male" });

        try {
          const newpdf = await pdfdata.saveDocument();
          //console.log(newpdf);

          // Write to file
          const outputPath = path.join(folder, pdfInput);
          await fs.promises.writeFile(outputPath, Buffer.from(newpdf));
          //console.log("PDF saved successfully!");
        } catch (writeError) {
          console.error("Error writing PDF:", writeError);
        }
      } else {
        console.log("Not have xfa");
      }
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};

const postPdf = async (req, res) => {
  try {
    console.log(req.body.objectId);

    const idTicket = req.body.objectId;
    const folder = "./src/OutputFiles/Pdf/" + idTicket;

    if (!fs.existsSync(folder)) {
      await fs.mkdirSync(folder, { recursive: true });
    }

    await getTicket(idTicket);

    const files = await fs.promises.readdir('./src/InputFiles');
    for (const file of files) {
      await procesarPdf(file, folder);
    }

    const urlFolder = await createFolder(idTicket);
    console.log(urlFolder);

    //await deleteFolder();

    const subirPdfs = await fs.promises.readdir(folder);
    const uploadPromises = await subirPdfs.map(file => createFile(path.join(folder, file), urlFolder));
    await Promise.all(uploadPromises)//.then(async()=> await fs.promises.rmdir(folder, { recursive: true }));

    //await fs.promises.rmdir(folder, { recursive: true });

    res.send("PDF generated and saved successfully!");
  } catch (postPdfError) {
    console.error("Error in postPdf:", postPdfError);
    res.status(500).send("Internal Server Error");
  }
};

export default postPdf;
