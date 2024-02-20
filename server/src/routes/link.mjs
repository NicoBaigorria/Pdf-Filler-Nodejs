import app from "express";
import getLinksPdfs from "../controlles/link.mjs";

const router = app.Router();

router.get("/", getLinksPdfs);

router.get("*", (req, res) => {
  res.status(404);
  res.send({ error: "Not found" });
})

export default router;