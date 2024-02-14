import express from "express";
import routePdf from './routes/pdf-filler.mjs';

const app = express(),
port = process.env.PORT || 3300;

app.use(express.json());

app.use('/PdfFiller', routePdf)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
