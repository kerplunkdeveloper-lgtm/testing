const express = require("express");
const router = express.Router();
const {
  getSocialAccounts,
  getSocialAccountById,
  createSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
} = require("../controllers/socialAccountController");

const { protect } = require("../middleware/auth");

router.use(protect);

router.route("/")
  .get(getSocialAccounts)
  .post(createSocialAccount);

router.route("/:id")
  .get(getSocialAccountById)
  .put(updateSocialAccount)
  .delete(deleteSocialAccount);

module.exports = router;
