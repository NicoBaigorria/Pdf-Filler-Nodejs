const checkFiles = async (folder, programa) => {
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

  console.log(responseData.results)

  console.log(programa)

  const listaPdfs = []

  responseData.results.map( file => listaPdfs.push(file.name))

  return( listaPdfs )
}

const createLinkPdfs = async (folder, programa) => {
  const url = `https://app.hubspot.com/files/21669225/?folderId=${folder}`;

  const result = await checkFiles(folder, programa);

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
      "updated": "2016-09-28"
      "properties": [

      ]
    }
  ]
}`;

  return bodyCard;
}

const getLinksPdfs = async (req, res) => {
  const folderId = req.query.id_folder;
  const result = createLinkPdfs(folderId);

  res.status(200);
  res.send(result);
}

export default getLinksPdfs;