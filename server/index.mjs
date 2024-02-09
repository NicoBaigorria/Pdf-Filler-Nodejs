import express from "express";
import fs from "fs";
import path from "path";
import * as pdfjs from "pdfjs-dist/build/pdf.min.mjs";

const app = express();
const port = 3000;

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

// Set the path to the PDF file
const pdfUrl =
  "https://21669225.fs1.hubspotusercontent-na1.net/hubfs/21669225/PDF-Gobierno_de_Canada/imm1294e.pdf";

app.get("/", async (req, res) => {
  try {
    // Asynchronous download of PDF
    const pdf = await pdfjs.getDocument({ url: pdfUrl, enableXfa: true });

    pdf.promise.then(function (pdfdata) {
      console.log("PDF loaded");

      const xfa = pdfdata.allXfaHtml;

      console.log(xfa);

      // Uso de la función
      const resultadoSelect = buscarPropiedad(xfa, "select");
      console.log("Resultado para 'select':", resultadoSelect);

      const resultadoInput = buscarPropiedad(xfa, "input");
      console.log("Resultado para 'input':", resultadoInput);

      const resultadotextarea = buscarPropiedad(xfa, "textarea");
      console.log("Resultado para 'textarea':", resultadotextarea);

      pdfdata.annotationStorage.setValue("FamilyName31585", {
        value: "asdsadas",
      });

      pdfdata.annotationStorage.setValue("Sex31593", { value: "Male" });

      //pdfdata.getData().then(res =>{
      pdfdata.saveDocument().then((newpdf) => {
        console.log(newpdf);
        
        // Write to file
        const outputPath = path.join("./output.pdf");
        fs.writeFile(outputPath, Buffer.from(newpdf), (err) => {
          if (err) {
            console.error("Error writing PDF:", err);
            res.status(500).send("Error writing PDF");
            return;
          }
          console.log("PDF saved successfully!");
        });

        res.send("PDF generated and saved successfully!");
      });
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
