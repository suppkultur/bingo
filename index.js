"use strict";

const hapi = require("@hapi/hapi");
const inert = require("@hapi/inert");
const path = require("path");
const cards = require("./cards");

const init = async () => {
  const server = new hapi.Server({
    port: 3000,
    host: "0.0.0.0",
  });

  await server.register(inert);

  server.route({
    method: "GET",
    path: "/generate-cards",
    handler: async (request, h) => {
      const count = request.query.count || 1;
      const buffer = await cards.generatePDF(count);
      return h.response(buffer).type("application/pdf");
    },
  });

  server.route({
    method: "GET",
    path: "/{param*}",
    handler: {
      directory: {
        path: path.join(__dirname, "public"),
      },
    },
  });

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
