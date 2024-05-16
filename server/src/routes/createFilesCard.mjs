import app from "express";
import getCard from "../controlles/createFilesCard.mjs";

const router = app.Router();

router.get("/", getCard);

router.get("*", (req, res) => {
  res.status(404);
  res.send({ error: "Not found" });
})

export default router;