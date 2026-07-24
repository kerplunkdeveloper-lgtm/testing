const express = require("express");

const router = express.Router();

const {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");

const {
  protect,
  authorize,
} = require("../middleware/auth");


// CREATE CLIENT
router.post(
  "/",
  protect,
  authorize("admin", "operationmanager", "team"),
  createClient
);


// GET ALL CLIENTS
router.get(
  "/",
  protect,
  authorize("admin", "operationmanager", "team"),
  getClients
);


// GET SINGLE CLIENT
router.get(
  "/:id",
  protect,
  authorize("admin", "operationmanager", "team"),
  getClient
);


// UPDATE CLIENT
router.put(
  "/:id",
  protect,
  authorize("admin", "operationmanager", "team"),
  updateClient
);


// DELETE CLIENT
router.delete(
  "/:id",
  protect,
  authorize("admin", "operationmanager", "team"),
  deleteClient
);

module.exports = router;