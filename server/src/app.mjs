import express from "express";
import routePdf from './routes/pdf-filler.mjs';
import routeLink from "./routes/link.mjs";

const app = express(),
port = process.env.PORT || 3300;

app.use(express.json());

app.use('/PdfFiller', routePdf)

app.use('/getlink', routeLink)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
