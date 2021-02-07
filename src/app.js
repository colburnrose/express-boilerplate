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

const cards = [
  {
    id: 1,
    title: "Task One",
    content: "This is card one",
  },
  {
    id: 2,
    title: "Task Two",
    content: "This is card two",
  },
];

const lists = [
  {
    id: 1,
    header: "List One",
    cardIds: [1],
  },
  {
    id: 2,
    header: "List Two",
    cardIds: [2],
  },
];

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

// GET: Return a list of cards
app.get("/card", (req, res) => {
  const { title, content } = req.body;
  if (!title) {
    logger.error(`Title is required`);
    return res.status(400).send("Invalid data.");
  }
  if (!content) {
    logger.error(`Content is required`);
    return res.status(400).send("Invalid data.");
  }

  // get an id
  const id = uuid();
  const card = {
    id,
    title,
    content,
  };
  cards.push(card);

  logger.info(`Card with id ${id} created.`);
  res.status(201).location(`http://localhost:8000/card/${id}`).json(card);
});

// GET: CardById /card/1
app.get("/card/:id", (req, res) => {
  const { id } = req.params;
  const card = cards.find((c) => c.id == id);

  // check if card is found
  if (!card) {
    logger.error(`Card with id ${id} not found`);
    return res.status(400).send("Card Not Found!");
  }
  res.json(card);
});

// GET: Return a list of lists
app.get("/list", (req, res) => {
  res.json(lists);
});

// GET: ListById /list/1
app.get("/list/:id", (req, res) => {
  const { id } = req.params;
  const list = lists.find((l) => l.id == id);

  if (!list) {
    logger.error(`List with id ${id} not found`);
    return res.status(400).send("List Not Found!");
  }
  res.json(list);
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
