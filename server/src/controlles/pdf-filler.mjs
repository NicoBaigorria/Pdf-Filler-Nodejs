import fs from "fs";
import path from "path";
import * as pdfjs from "pdfjs-dist/build/pdf.min.mjs";
import getTicket from "../services/hubspot.mjs";


function buscarPropiedad(json, targetName) {
  const resultados = [];

  function buscarRecursivamente(elemento) {
    if (elemento.name === targetName) {
      if (elemento.name === "select") {
        resultados.push(elemento.children);
      } else if (elemento.name === targetName) {
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

const procesarPdf = async (pdfInput) => {

  try {
    // Asynchronous download of PDF
    const pdf = await pdfjs.getDocument({ url: "./src/InputFiles/"+ pdfInput, enableXfa: true });

    
    pdf.promise.then(function (pdfdata) {
      console.log("PDF loaded");

      const xfa = pdfdata.allXfaHtml;

      if(xfa){
      console.log(xfa);

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

      //pdfdata.getData().then(res =>{
      pdfdata.saveDocument().then((newpdf) => {
        console.log(newpdf);

        // Write to file
        const outputPath = path.join("./src/OutputFiles/Pdf/"+ pdfInput +".pdf");
        fs.writeFile(outputPath, Buffer.from(newpdf), (err) => {
          if (err) {
            console.error("Error writing PDF:", err);
            res.status(500).send("Error writing PDF");
            return;
          }
          console.log("PDF saved successfully!");
        });
      });
    }else{
    }
      console.log("not have xfa")
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Internal Server Error");
  }

}

const postPdf = async (req, res) => {

  console.log(req.body.objectId)

  const idTicket = req.body.objectId;

  await getTicket(idTicket)

  await fs.readdir('./src/InputFiles', (err, files) => {
    files.forEach(async file => {
      //await procesarPdf(file)
    });
  });

  res.send("PDF generated and saved successfully!");
}

export default postPdf;