import fs from "fs";
import path from "path";
import * as pdfjs from "pdfjs-dist/build/pdf.min.mjs";
import { getTicket, createFolder, createFile, deleteFolder, updateProperty } from "../services/hubspot.mjs";

function buscarPropiedad(json, targetName) {
  const resultados = [];

  function buscarRecursivamente(elemento) {
    //if(select == "select") console.log(elemento)
    if (elemento.name === targetName) {

      resultados.push(elemento.attributes.dataId);

      /*
      if (elemento.name === "select") {
        resultados.push(elemento.attributes.dataId);
      } else {
        resultados.push(elemento.attributes.dataId);
        //console.log(elemento.attributes)
      }
      */
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

const procesarPdf = async (pdfInput, folder, tickeProperties) => {
  try {
    const pdf = await pdfjs.getDocument({ url: "./src/InputFiles/" + pdfInput, enableXfa: true });

    pdf.promise.then(async function (pdfdata) {
      console.log("PDF loaded");

      const xfa = pdfdata.allXfaHtml;

      if (xfa) {
        //console.log(xfa);

        // Busco Propiedades
        const resultadoSelect = buscarPropiedad(xfa, "select");
        //console.log("Resultado para 'select':", resultadoSelect);

        const resultadoInput = buscarPropiedad(xfa, "input");
        //console.log("Resultado para 'input':", resultadoInput);

        const resultadotextarea = buscarPropiedad(xfa, "textarea");
        //console.log("Resultado para 'textarea':", resultadotextarea);

        // Relleno campos
        //pdfdata.annotationStorage.setValue("FamilyName31585", { value: "asdsadas" });
        //pdfdata.annotationStorage.setValue("Sex31593", { value: "Male" });

        const matchPropiedades = await JSON.parse(fs.readFileSync("./src/Jsons/matchPropiedades.json", "utf8"));

       // console.log(matchPropiedades)


          for(let campo in resultadotextarea){
            for(let property in matchPropiedades){
              //console.log(resultadotextarea[campo], property)
              if(resultadotextarea[campo].includes(property)){

                const InternalName = matchPropiedades[property].internalName;

                const value = tickeProperties[InternalName];

                //console.log(resultadotextarea[campo]+ " contiene: "+ property+ " value: "+value)

                await pdfdata.annotationStorage.setValue(resultadotextarea[campo], { value: value });
              }
            }
          }

          for(let campo in resultadoInput){
            for(let property in matchPropiedades){

              if(resultadoInput[campo].includes(property)){

                const InternalName = matchPropiedades[property].internalName;

                const value = tickeProperties[InternalName];

                //console.log(resultadoInput[campo]+ " contiene: "+ property+ " value: "+value)

                await pdfdata.annotationStorage.setValue(resultadoInput[campo], { value: value });
              }
            }
          }

          for(let campo in resultadoSelect){
            for(let property in matchPropiedades){

              if(resultadoSelect[campo].includes(property)){

                const InternalName = matchPropiedades[property].internalName;

                const value = tickeProperties[InternalName];

                console.log(resultadoSelect[campo]+ " contiene: "+ property+ " value: "+value)

                await pdfdata.annotationStorage.setValue(resultadoSelect[campo], { value: value });
              }
            }
          }

          //await pdfdata.annotationStorage.setValue(InternalName, { value: value });


        /*
        for (let key in tickeProperties) {
          try {
            const value = tickeProperties[key];
            const InternalName = matchPropiedades[key].internalName;

           // console.log(key + " / " + InternalName + ": " + value)

            for(let campo in resultadotextarea){
              console.log(resultadotextarea[campo], key)
              if(resultadotextarea[campo].includes(key)){
                console.log(resultadotextarea[campo]+ "contine: "+ key)
              }
            }

            //await pdfdata.annotationStorage.setValue(InternalName, { value: value });
          } catch (e) {
            console.log("error al rellenar campo")
          }
        }
        */

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

    const ticketData = await getTicket(idTicket);

    const tickeProperties = ticketData.properties;

    console.log(tickeProperties)

    const files = await fs.promises.readdir('./src/InputFiles');
    for (const file of files) {
      await procesarPdf(file, folder, tickeProperties);
    }

    const folderId = await createFolder(idTicket);
    console.log(folderId);

    //await deleteFolder();

    const jsonPropsTicket = {
      "id_folder": folderId
    }

    await updateProperty(idTicket, jsonPropsTicket)

    const subirPdfs = await fs.promises.readdir(folder);
    const uploadPromises = await subirPdfs.map(file => createFile(path.join(folder, file), folderId));
    await Promise.all(uploadPromises)//.then(async()=> await fs.promises.rmdir(folder, { recursive: true }));

    //await fs.promises.rmdir(folder, { recursive: true });

    res.send("PDF generated and saved successfully!");
  } catch (postPdfError) {
    console.error("Error in postPdf:", postPdfError);
    res.status(500).send("Internal Server Error");
  }
};

export default postPdf;
