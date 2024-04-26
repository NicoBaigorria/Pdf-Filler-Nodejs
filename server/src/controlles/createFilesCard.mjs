import fs from "fs";
import {
  getTicket,
  createFolder,
  createFile,
  deleteFolder,
  updateProperty,
} from "../services/hubspot.mjs";

const checkFiles = async (folder, programas) => {
  const url = `https://api.hubapi.com/files/v3/files/search?parentFolderId=${folder}`;

  const accessToken = "pat-na1-31886066-9adb-4992-930a-91cd28f192ff";

  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
  });

  const response = await fetch(url, {
    method: "GET",
    headers: headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const responseData = await response.json();

  //console.log(programas)

  let programasRequeridos = programas.split(";");

  //console.log(programasRequqeridos)

  const planesListaPath = "./src/Jsons/planesForm.json";

  const planesLista = await JSON.parse(fs.readFileSync(planesListaPath));

  //console.log(planesLista)

  const listaPdfs = [];

  responseData.results.map((file) => listaPdfs.push(file.name));

  //console.log(listaPdfs)

  let pdfsPendientes = {};

  programasRequeridos.map((programa) => {
    pdfsPendientes[programa] = {};

    console.log("gfdg", planesLista[programa], programa);
    if (planesLista[programa]) {
      const pdfs = planesLista[programa];
      for (const pdf in pdfs) {
        listaPdfs.includes(pdf)
          ? (pdfsPendientes[programa][pdf] = true)
          : (pdfsPendientes[programa][pdf] = false);
      }
    }
  });

  //console.log(pdfsPendientes)

  return pdfsPendientes;
};

const createFillFolder = async (folder, subCarpeta, file) => {
  const path = folder + "/" + subCarpeta;
  const inputsFilesPath = "./src/InputFiles/";

  if (fs.existsSync(path)) {
    if (!fs.existsSync(path + "/" + file + ".pdf")) {
      try {
        const dataPdf = await fs.readFileSync(inputsFilesPath + file + ".pdf");
        await fs.writeFileSync(path + "/" + file + ".pdf", dataPdf);
        console.log("File copied successfully!");
      } catch (err) {
        console.error("Error:", err);
      }
    }
  } else {
    await fs.mkdir(path, { recursive: true }, async () => {
      console.log("asdsadsagfdhgfgh");
      try {
        const dataPdf = await fs.readFileSync(inputsFilesPath + file + ".pdf");
        await fs.writeFileSync(path + "/" + file + ".pdf", dataPdf);
        console.log("File copied successfully!");
      } catch (err) {
        console.error("Error:", err);
      }
    });
  }
};

const subirPdfs = async (hs_object, folderID, programas, aplicantes) => {
  try {
    const idTicket = folderID;
    const folder = "./src/OutputFiles/Pdf/" + idTicket;

    if (!fs.existsSync(folder)) {
      await fs.mkdirSync(folder, { recursive: true });
    }

    // Selecciono los Formularios segun el plan

    const listaProgramas = await JSON.parse(
      fs.readFileSync("./src/Jsons/planesForm.json", "utf8")
    );

    const processingPromises = [];

    // Crear carpetas segun corresponda y llenar

    let programasRequeridos = programas.split(";");

    let aplicantesList = aplicantes.split(";");

    console.log("programasRequeridos", programasRequeridos);

    console.log("appplicantes", aplicantesList);

    programasRequeridos.map(async (programa) => {
      console.log(listaProgramas[programa]);
      for (let pdf in listaProgramas[programa]) {
        await listaProgramas[programa][pdf].aplicantes.map(
          async (aplicante) => {
            processingPromises.push(createFillFolder(folder, aplicante, pdf));
          }
        );
      }
    });

    await Promise.all(processingPromises);

    // Borrar carpeta en Hubpsot si existe.
    await deleteFolder(folderID);

    // Crear una carpeta en Hubspot.

    const folderId = await createFolder(hs_object);
    console.log(hs_object);

    const jsonPropsTicket = {
      id_folder: folderId,
    };

    // Actualizar propiedad folder_id del Ticket.
    await updateProperty(hs_object, jsonPropsTicket);


    // Subir los PDFs a la nueva carpeta.
    const foldersAplicantes = await fs.promises.readdir(folder);

    let uploadPromises = [];

    foldersAplicantes.map(async folderAplicante=>{
        const folders = await fs.promises.readdir(folder+"/"+folderAplicante);
        folders.map(async file=>{

            const idFolderAplicante = await createFolder(folderAplicante, folderId)

            uploadPromises.push(createFile(folder+"/"+folderAplicante, file, idFolderAplicante))
        })
    })
    /*
    const uploadPromises = pdfsListos.map(async (file) => {
        await createFile(folder, file, folderId);
      });
      */

    await Promise.all(uploadPromises);

    // Borrar carpeta en la app.

    //await fs.promises.rmdir(folder, { recursive: true });

    console.log("uuuuuuuu");
  } catch (e) {
    console.log(e);
  }
};

const createLinkPdfs = async (hs_object, folder, programa, aplicantes) => {
  const url = `https://app.hubspot.com/files/21669225/?folderId=${folder}`;

  //const checkList = await checkFiles(folder, programa);

  const checkList = subirPdfs(hs_object, folder, programa, aplicantes);

  //console.log("asdsad", checkList)

  const cardFilesList = [];
  /*
    for (let programa in checkList) {
        for (let file in checkList[programa]) {

            const property = {
                "label": file,
                "dataType": "STATUS",
                "value": checkList[programa][file] ? "completado" : "No hay propiedades",
                "optionType": checkList[programa][file] ? "SUCCESS" : "DANGER"
            }
            cardFilesList.push(property)
        }
    }
    */

  const bodyCard = {
    results: [
      {
        objectId: 245,
        title: "Listado de formularios",
        created: "2016-09-15",
        priority: "HIGH",
        project: "API",
        reported_by: "msmith@hubspot.com",
        description:
          "Customer reported that the APIs are just running too fast. This is causing a problem in that they're so happy.",
        reporter_type: "Account Manager",
        status: "In Progress",
        ticket_type: "Bug",
        updated: "2016-09-28",
        properties: cardFilesList,
      },
      {
        objectId: 245,
        title: "Link a carpeta",
        link: url,
        created: "2016-09-15",
        priority: "HIGH",
        project: "API",
        reported_by: "msmith@hubspot.com",
        description:
          "Customer reported that the APIs are just running too fast. This is causing a problem in that they're so happy.",
        reporter_type: "Account Manager",
        status: "In Progress",
        ticket_type: "Bug",
        updated: "2016-09-28",
      },
    ],
  };

  console.log(bodyCard);

  return bodyCard;
};

const createFilesCard = async (req, res) => {
  const folderId = req.query.id_folder ? req.query.id_folder : null;
  const programas = req.query.programa_formularios
    ? req.query.programa_formularios
    : null;
  const aplicantes = req.query.aplicantes_relacionados
    ? req.query.aplicantes_relacionados
    : null;
  const hs_object = req.query.hs_object_id ? req.query.hs_object_id : null;
  if (folderId && programas) {
    const result = await createLinkPdfs(
      hs_object,
      folderId,
      programas,
      aplicantes
    );

    res.status(200);
    res.send(JSON.stringify(result));
  } else {
    const result = {
      results: [
        {
          objectId: 245,
          title: "Faltan Parametros",
          created: "2016-09-15",
          priority: "HIGH",
          project: "API",
          reported_by: "msmith@hubspot.com",
          description: "Faltan Parametros",
          reporter_type: "Account Manager",
          status: "In Progress",
          ticket_type: "Bug",
          updated: "2016-09-28",
        },
      ],
    };

    res.status(200);
    res.send(result);
  }
};

export default createFilesCard;
