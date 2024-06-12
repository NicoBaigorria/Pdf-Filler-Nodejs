import app from "express";
import consultaPdfs from "../controlles/consultaPdfs.mjs";

const router = app.Router();

router.get("/", consultaPdfs);

router.get("*", (req, res) => {
  res.status(404);
  res.send({ error: "Not found" });
})

export default router;