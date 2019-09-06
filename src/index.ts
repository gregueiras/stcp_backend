const express = require("express");
import Expo, { ExpoPushMessage } from "expo-server-sdk";
const fetch = require("node-fetch");

let expo = new Expo();
const app = express();

app.use(express.json());

const port = process.env.PORT || 3000;
const interval = 30;

const clients = {}; //Provider_StopCode is key, [{token, lines: [{line, expire}]}] is value

interface request {
  token: string;
  expire: string;
  stopCode: string;
  provider: string;
  line: string;
}

interface line {
  line: string;
  expire: number;
}

interface clientEntry {
  token: string;
  lines: line[];
}

app.post("/unsubscribe", (req, res) => {
  const { token } = req.body;

  const intervalID = clients[token];

  clearInterval(intervalID);
  res.send("SUCCESS");
});

app.post("/", (req, res) => {
  if (req.body.token) {
    const { token, stopCode, provider, line } = req.body as request;

    console.log(`Line ${provider}:${stopCode} requested`);

    addClient({ token, provider, stopCode, line });

    res.send("SUCESS");
    return;
  }

  res.send(JSON.stringify(req.body));
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

function getCode(provider, stopCode) {
  return `${provider}_${stopCode}`;
}

function addClient({ token, provider, stopCode, line }) {
  const newEntry: clientEntry = {
    token,
    lines: [{ line, expire: Infinity }]
  };
  
  const code = getCode(provider, stopCode);
  const stop = clients[code];
  
  if (stop) {
    clients[code] = [...stop, newEntry]
  } else {
    clients[code] = [newEntry]
  }

  console.log(clients);
}

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
