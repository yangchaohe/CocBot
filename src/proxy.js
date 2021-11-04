const proxy = require("node-global-proxy").default;

proxy.setConfig({
  http: "http://localhost:8888",
  https: "http://localhost:8888",
});
proxy.start();

/** Proxy working now! */