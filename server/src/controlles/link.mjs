import fs from "fs";

const checkFiles = async (folder, programas) => {
  const url = `https://api.hubapi.com/files/v3/files/search?parentFolderId=${folder}`

  const accessToken = 'pat-na1-31886066-9adb-4992-930a-91cd28f192ff';

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
        "value": checkList[programa][file] ? "completado" : "faltante",
        "optionType": checkList[programa][file] ? "SUCCESS" : "DANGER"
      }
      cardFilesList.push(property)
    }
  }

  const bodyCard = `{
  "results": [
    {
      "objectId": 245,
      "title": "Link a PDFS",
      "link": "${url}",
      "created": "2016-09-15",
      "priority": "HIGH",
      "project": "API",
      "reported_by": "msmith@hubspot.com",
      "description": "Customer reported that the APIs are just running too fast. This is causing a problem in that they're so happy.",
      "reporter_type": "Account Manager",
      "status": "In Progress",
      "ticket_type": "Bug",
      "updated": "2016-09-28",
      "properties": ${JSON.stringify(cardFilesList)}
    }
  ]
}`;

  console.log(bodyCard)

  return bodyCard;
}

const getLinksPdfs = async (req, res) => {
  const folderId = req.query.id_folder;
  const programas = req.query.programa_formularios
  const result = await createLinkPdfs(folderId, programas);

  res.status(200);
  res.send(result);
}

export default getLinksPdfs;