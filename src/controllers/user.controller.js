const errorHandler = require("../utils/errorHandler");

exports.getUser = async (req, res) => {
    try {
      return res.status(200).json({
        message: "User fetched successfully.",
        data: req.user,
      });
    } catch (error) {
        console.log(error);
      errorHandler(res, error, "getUser");
    }
  };