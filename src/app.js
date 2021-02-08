require("dotenv").config;
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const winston = require("winston");
const { v4: uuid } = require("uuid");
const { NODE_ENV } = require("./config");
const store = require("../store");

const app = express();
const morganConfiguration = NODE_ENV === "production" ? "tiny" : "common";

app.use(morgan(morganConfiguration));
app.use(helmet());
app.use(cors());
app.use(express.json());

// authorization
app.use(function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_TOKEN;
  const authToken = req.get("Authorization");

  if (!authToken || authToken.split(" ")[1] !== apiToken) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: "Unauthorized Request!" });
  }
  next();
});

// GET: List of bookmarks
app.get("/bookmarks", (req, res) => {
  res.json(store.bookmarks);
});
// GET: Get bookmarkById
app.get("/bookmarks/:id", (req, res) => {
  const { id } = req.params;
  const bookmark = store.bookmarks.find((c) => c.id == id);
  if (!bookmark) {
    logger.error(`Bookmark with id ${id} does not exist.`);
    return res.status(400).send("Bookmark Not Found.");
  }
  res.json(bookmark);
});

// POST: Add new bookmark
app.post("/bookmarks/:id", (req, res) => {
  const { title, url, description, rating } = req.body;

  if (!title) {
    logger.error(`Title is required`);
    return res.status(400).send("Invalid data");
  }
  if (!isWebUri(url)) {
    logger.error(`Invalid url ${url} supplied.`);
    return res.status(400).send("Invalid data");
  }
  if (!description) {
    logger.error(`Description is required`);
    return res.status(400).send("Invalid data");
  }
  if (!Number(rating) || rating < 0 || rating > 5) {
    logger.error(`Rating must be a number.`);
    return res.status(400).send("Rating must be between 0 and 5.");
  }

  const bookmark = {
    id: uuid(),
    title,
    url,
    description,
    rating,
  };

  store.bookmarks.push(bookmark);
  logger.info(`Bookmark with id ${bookmark.id} has been created.`);

  res
    .status(201)
    .location(`http://localhost:8000/bookmarks/${bookmark.id}`)
    .json(bookmark);
});

// DELETE: Remove bookmarkById
app.delete("/bookmarks/:id", (req, res) => {
  const { id } = req.params;
  const bookmarkIndex = store.bookmarks.findIndex((bid) => bid.id == id);
  if (bookmarkIndex === -1) {
    logger.error(`Bookmark with id ${id} not found.`);
    return res.status(400).send("Not Found!");
  }
  store.bookmarks.splice(bookmarkIndex, 1);
  logger.info(`Bookmark with id ${id} deleted.`);
  res.status(204).end();
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
