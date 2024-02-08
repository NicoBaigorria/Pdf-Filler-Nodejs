import express from "express";
import fs from 'fs';
import path from 'path';
import { pdfjsLib } from 'pdf-lib';

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
const pdfUrl = 'https://21669225.fs1.hubspotusercontent-na1.net/hubfs/21669225/PDF-Gobierno_de_Canada/imm1294e.pdf';


app.get('/', async (req, res) => {
  try {
    // Asynchronous download of PDF
    const pdf = await pdfjsLib.getDocument({ url: pdfUrl, enableXfa: true });
    const pdfData = await pdf.saveDocument();

    console.log('PDF saved:');

    res.send('PDF generated and saved successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
