import app from "express";
import extractData from "../controlles/pdf-extract-data.mjs";

const router = app.Router();

router.get("/", extractData);

router.get("*", (req, res) => {
  res.status(404);
  res.send({ error: "Not found" });
})

export default router;