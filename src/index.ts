const express = require("express");
import Expo, { ExpoPushMessage } from "expo-server-sdk";

let expo = new Expo();
const app = express();

app.use(express.json());

const port = process.env.PORT || 3000;

interface request {
  token: string;
  expire: number;
  stopCode: string;
  provider: string;
  lines: string[];
}

app.post("/", (req, res) => {
  console.log(req.query);

  if (req.body.token) {
    const {
      token,
      expire = 10,
      stopCode,
      provider,
      lines
    } = req.body as request;

    const intervalID = setInterval(
      () => handleReq(token, stopCode, provider, lines),
      30 * 1000
    );
    setTimeout(() => clearInterval(intervalID), expire * 60 * 1000);

    res.send("SUCESS");
    return;
  }

  res.send(JSON.stringify(req.body));
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

function handleReq(
  token: string,
  stopCode: string,
  provider: string,
  lines: string[]
) {

  const message: ExpoPushMessage = {
    to: token,
    sound: 'default',
    body: stopCode + provider,
    title: 'STCP',
  }

  if (!Expo.isExpoPushToken(token)) {
    console.error("Invalid Token")
  }

  expo.sendPushNotificationsAsync([message])
  
}
