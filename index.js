import express from "express";
import mqtt from "mqtt";
import crypto from "crypto";

const {
  MQTT_HOST,
  MQTT_PORT = "1883",
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TOPIC,
  MQTT_PAYLOAD = "3",
  MQTT_QOS = "2",
  HTTP_PORT = "3000",
  AUTH_BEARER_TOKEN
} = process.env;

if (!MQTT_HOST || !MQTT_TOPIC || !AUTH_BEARER_TOKEN) {
  throw new Error("MQTT_HOST, MQTT_TOPIC, and AUTH_BEARER_TOKEN must be set");
}

const mqttUrl = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;

const mqttClient = mqtt.connect(mqttUrl, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD
});

const app = express();
app.use(express.json());

/**
 * Bearer auth middleware
 */
function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized");
  }

  const token = header.slice(7);
  const valid =
    token.length === AUTH_BEARER_TOKEN.length &&
    crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(AUTH_BEARER_TOKEN)
    );

  if (!valid) {
    return res.status(401).send("Unauthorized");
  }

  next();
}

app.post("/door/open", authMiddleware, (req, res) => {
  mqttClient.publish(
    MQTT_TOPIC,
    MQTT_PAYLOAD,
    { qos: Number(MQTT_QOS) },
    err => {
      if (err) return res.status(500).send("Failed to publish");
      res.send("Unlatch command sent");
      console.log("Unlatch command sent");
    }
  );
});

app.get("/healthz", (_, res) => res.send("ok"));

app.listen(HTTP_PORT, () =>
  console.log(`HTTP server listening on ${HTTP_PORT}`)
);
