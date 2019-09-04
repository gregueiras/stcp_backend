const express = require("express");
import Expo, { ExpoPushMessage } from "expo-server-sdk";
const fetch = require("node-fetch");

let expo = new Expo();
const app = express();

app.use(express.json());

const port = process.env.PORT || 3000;
const interval = 30;

const clients = {}; //token is key, value is intervalID

interface request {
  token: string;
  expire: string;
  stopCode: string;
  provider: string;
  lines: string[];
}

app.post("/unsubscribe", (req, res) => {
  const { token } = req.body;

  const intervalID = clients[token];

  clearInterval(intervalID);
  res.send("SUCCESS");
});

app.post("/", (req, res) => {
  console.log(req.query);
  console.log(req.body);

  if (req.body.token) {
    const {
      token,
      expire: expireTemp,
      stopCode,
      provider,
      lines
    } = req.body as request;

    const expire = expireTemp
      ? parseInt(String(expireTemp).replace("*", ""))
      : 10;

    console.log(
      `Dispatching updates for ${provider}:${stopCode} [${lines}] every ${interval} seconds for ${expire} minutes`
    );
    const intervalID = setInterval(
      () => handleReq(token, stopCode, provider, lines),
      interval * 1000
    );

    if (clients[token]) clients[token] = [...clients[token], intervalID];
    else clients[token] = intervalID;

    setTimeout(() => clearInterval(intervalID), expire * 60 * 1000);

    res.send("SUCESS");
    return;
  }

  res.send(JSON.stringify(req.body));
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

async function handleReq(
  token: string,
  stopCode: string,
  provider: string,
  lines: string[]
) {
  if (!Expo.isExpoPushToken(token)) {
    console.error("Invalid Token");
    //return;
  }

  const nextLines = await loadMenu(provider, stopCode, lines);
  console.log(nextLines);

  const body = nextLines
    .map(
      ({ line, destination, time }) =>
        `${line} - ${destination
          .replace(/\t/g, "")
          .replace(/  */g, " ")} - ${time}`
    )
    .join("\n");

  const message: ExpoPushMessage = {
    to: token,
    sound: "default",
    body,
    title: stopCode
  };

  expo.sendPushNotificationsAsync([message]);
  console.log("SENT");
  console.log(message);
}

async function loadMenu(
  providerTemp: string,
  stopCode: string,
  lines: string[]
) {
  try {
    const provider = providerTemp.replace(/ /g, "+").toUpperCase();
    const stop = stopCode.replace(/ /g, "+");

    const searchUrl = `http://www.move-me.mobi/NextArrivals/GetScheds?providerName=${provider}&stopCode=${provider}_${stop}`;

    const response = await fetch(searchUrl); // fetch page
    const json = await response.json(); // get response text

    const info = json
      .map(({ Value }) => Value)
      .map(([line, destination, time]) => {
        return {
          line,
          destination,
          time,
          id: line + "_" + time + "_" + destination + "_" + Math.random()
        };
      })
      .filter(({ line }) => lines.includes(line));

    const nextLines = lines
      .map(wantedLine => info.find(({ line }) => line === wantedLine))
      .sort(({ time: timeA }, { time: timeB }) => {
        return (
          parseInt(timeA.replace("*", "")) - parseInt(timeB.replace("*", ""))
        );
      });

    return nextLines;
  } catch (error) {
    console.log("ERRO");
    console.log(error);
  }
}
