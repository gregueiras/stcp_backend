const express = require("express");
import Expo, { ExpoPushMessage } from "expo-server-sdk";
const fetch = require("node-fetch");

let expo = new Expo();
const app = express();

app.use(express.json());

const port = process.env.PORT || 3000;
const interval = 30;

const clients = {}; //Provider_StopCode is key, [{token, lines: [{line, time}]}] is value
interface Array<T> {
  flat(): Array<T>;
  flatMap(func: (x: T) => T): Array<T>;
}

interface request {
  token: string;
  stopCode: string;
  provider: string;
  line: string;
}

interface line {
  line: string;
  destination: string;
  time: number;
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

setInterval(() => {
  const stops = Object.keys(clients);
  stops.map(stop => {
    const [provider, stopCode] = stop.split("_");
    const thisClients = clients[stop];

    handleStop(provider, stopCode, thisClients);
  });
}, 5 * 1000);

function getCode(provider, stopCode) {
  return `${provider}_${stopCode}`;
}

function addClient({ token, provider, stopCode, line }) {
  const newEntry: clientEntry = {
    token,
    lines: [{ line, time: null, destination: null }]
  };

  const code = getCode(provider, stopCode);
  const stop = clients[code];

  if (stop) {
    let found = false;
    const stopAdded = stop.map(({ token: tokenA, lines }) => {
      if (token === tokenA) {
        lines = [...lines, { line, time: null, destination: null }];
        found = true;
      }

      return { token, lines };
    });

    if (!found) clients[code] = [...stop, newEntry];
    else clients[code] = stopAdded;
  } else {
    clients[code] = [newEntry];
  }
}

async function handleStop(provider, stopCode, clientsArray: clientEntry[]) {
  const info = await loadLines(provider, stopCode);
  const lines = [...new Set(info.map(({ line }) => line))];

  const nextLines = lines
    .map(wantedLine => info.find(({ line }) => line === wantedLine))
    .sort(({ time: timeA }, { time: timeB }) => {
      return (
        parseInt(timeA.replace("*", "")) - parseInt(timeB.replace("*", ""))
      );
    });

  console.log(clientsArray);
  clientsArray.map(({ token, lines }) => {
    const wantedLines = lines
      .map(({ line: wantedLine }) =>
        nextLines.find(({ line }) => line === wantedLine)
      )
      .flat(2);

    sendMessage(token, wantedLines, stopCode);
  });
}

async function sendMessage(token: string, lines: line[], stopCode:string) {
  if (!Expo.isExpoPushToken(token)) {
    console.error("Invalid Token");
    //return;
  }

  const body = lines
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
    title: stopCode,
  };

  expo.sendPushNotificationsAsync([message]);
  console.log("SENT");
  console.log(message);
}

async function loadLines(providerTemp: string, stopCode: string) {
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
      });

    return info;
  } catch (error) {
    console.log("ERRO");
    console.log(error);
  }
}
