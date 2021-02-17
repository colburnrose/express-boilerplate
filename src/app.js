require("dotenv").config;
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const winston = require("winston");
const { v4: uuid } = require("uuid");
const { NODE_ENV } = require("./config");

const app = express();
const morganConfiguration = NODE_ENV === "production" ? "tiny" : "common";

app.use(morgan(morganConfiguration));
app.use(helmet());
app.use(cors());
app.use(express.json());

// authorization
app.use(function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_SERVER_ENDPOINT;
  const authToken = req.get("Authorization");

  if (!authToken || authToken.split(" ")[1] !== apiToken) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: "Unauthorized Request!" });
  }
  next();
});

app.use(function errorHandler(error, req, res, next) {
  let response = "";

  // set up winston
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: "info.log" })],
  });

  if (NODE_ENV === "production") {
    logger.add(
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    );
  } else {
    response = { error };
  }
  res.status(500).json(response);
});

module.exports = app;
