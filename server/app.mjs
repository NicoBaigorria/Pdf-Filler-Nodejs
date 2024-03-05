import express from "express";
import routePdf from './src/routes/pdf-filler.mjs';
import routeLink from "./src/routes/link.mjs";
import routePdfEstructura from "./src/routes/pdf-estructura.mjs"

const app = express(),
port = process.env.PORT || 3600;

app.use(express.json());

app.use('/PdfFiller', routePdf)

app.use('/getlink', routeLink)

app.use('/getEstructura', routePdfEstructura)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
