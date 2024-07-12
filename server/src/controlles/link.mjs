import fs from "fs";
import 'dotenv/config';

const accessToken = process.env.HUBSPOT_API_KEY;

const checkFiles = async (folder, programas) => {
  const url = `https://api.hubapi.com/files/v3/files/search?parentFolderId=${folder}`


  const headers = new Headers({
    'Authorization': `Bearer ${accessToken}`
  });

  const response = await fetch(url, {
    method: 'GET',
    headers: headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const responseData = await response.json();

  //console.log(programas)

  let programasRequqeridos = programas.split(';');

  //console.log(programasRequqeridos)

  const planesListaPath = "./src/Jsons/planesForm.json"

  const planesLista = await JSON.parse(fs.readFileSync(planesListaPath));

  //console.log(planesLista)

  const listaPdfs = []

  responseData.results.map(file => listaPdfs.push(file.name))

  //console.log(listaPdfs)

  let pdfsPendientes = {}


  programasRequqeridos.map(programa => {
    pdfsPendientes[programa] = {}
    const pdfs = planesLista[programa]
      pdfs.map(pdf => listaPdfs.includes(pdf) ?
        pdfsPendientes[programa][pdf] = true
        : pdfsPendientes[programa][pdf] = false
      )
  })

  //console.log(pdfsPendientes)

  return (pdfsPendientes)
}

const createLinkPdfs = async (folder, programa) => {
  const url = `https://app.hubspot.com/files/21669225/?folderId=${folder}`;

  const checkList = await checkFiles(folder, programa);

  console.log(checkList)

  const cardFilesList = []

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

  const bodyCard = {
  "results": [
    {
      "objectId": 245,
      "title": "Listado de formularios",
      "created": "2016-09-15",
      "priority": "HIGH",
      "project": "API",
      "reported_by": "msmith@hubspot.com",
      "description": "Customer reported that the APIs are just running too fast. This is causing a problem in that they're so happy.",
      "reporter_type": "Account Manager",
      "status": "In Progress",
      "ticket_type": "Bug",
      "updated": "2016-09-28",
      "properties": cardFilesList
    },
    {
    "objectId": 245,
      "title": "Link a carpeta",
      "link": url,
      "created": "2016-09-15",
      "priority": "HIGH",
      "project": "API",
      "reported_by": "msmith@hubspot.com",
      "description": "Customer reported that the APIs are just running too fast. This is causing a problem in that they're so happy.",
      "reporter_type": "Account Manager",
      "status": "In Progress",
      "ticket_type": "Bug",
      "updated": "2016-09-28",
    }
  ]
};

  console.log(bodyCard)

  return bodyCard;
}

const getLinksPdfs = async (req, res) => {
  const folderId = req.query.id_folder? req.query.id_folder : null;
  const programas = req.query.programa_formularios? req.query.programa_formularios : null;
  if(folderId && programas){
    const result = await createLinkPdfs(folderId, programas);

    res.status(200);
    res.send(JSON.stringify(result));
  } else {

    const result = {
      "results": [
        {
          "objectId": 245,
          "title": "Faltan Parametros",
          "created": "2016-09-15",
          "priority": "HIGH",
          "project": "API",
          "reported_by": "msmith@hubspot.com",
          "description": "Faltan Parametros",
          "reporter_type": "Account Manager",
          "status": "In Progress",
          "ticket_type": "Bug",
          "updated": "2016-09-28",
        }
      ]
      }
 
    res.status(200)
    res.send(result)
  }
}

export default getLinksPdfs;