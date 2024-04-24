import app from "express";
import createFilesCard from "../controlles/createFilesCard.mjs";

const router = app.Router();

router.get("/", createFilesCard);

router.get("*", (req, res) => {
  res.status(404);
  res.send({ error: "Not found" });
})

export default router;