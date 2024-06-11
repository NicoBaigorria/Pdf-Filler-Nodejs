import app from "express";
import { getContact } from "../controlles/contact.mjs";

const router = app.Router();

router.get("/", getContact);

router.get("*", (req, res) => {
  res.status(404);
  res.send({ error: "Not found" });
})

export default router;