import express from "express";
import routePdf from './src/routes/pdf-filler.mjs';
import routeLink from "./src/routes/link.mjs";
import routePdfEstructura from "./src/routes/pdf-estructura.mjs"
import routeExtractData from "./src/routes/pdf-extract-data.mjs"
import createFilesCard from "./src/routes/createFilesCard.mjs"

const app = express(),
port = process.env.PORT || 3600;

app.use(express.json());

app.use('/PdfFiller', routePdf)

app.use('/getlink', routeLink)

app.use('/createFilesCard', createFilesCard)

app.use('/getEstructura', routePdfEstructura)

app.use('/extractData', routeExtractData)

app.use('/contactInfo', contact)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
