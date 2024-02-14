import app from "express";
import postPdf from "../controlles/pdf-filler.mjs";

const router = app.Router();

router.post("/", postPdf);

router.get("*", (req, res) => {
  res.status(404);
  res.send({ error: "Not found" });
})

export default router;