const createLinkPdfs = (folder)=> {
    const url = `https://app.hubspot.com/files/21669225/?folderId=${folder}`;

    const bodyCard = `{
  "results": [
    {"objectId": 245,
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