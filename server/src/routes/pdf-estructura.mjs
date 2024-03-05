import app from "express";
import getEstructura from "../controlles/pdf-estructura.mjs";

const router = app.Router();

router.get("/", getEstructura);

router.get("*", (req, res) => {
  res.status(404);
  res.send({ error: "Not found" });
})

export default router;