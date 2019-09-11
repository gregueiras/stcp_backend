const express = require("express");
import Expo, { ExpoPushMessage } from "expo-server-sdk";
const fetch = require("node-fetch");
const prettyjson = require("prettyjson");

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
  time: string;
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

    console.log(`Line ${line} in ${provider}:${stopCode} requested`);

    addClient({ token, provider, stopCode, line });

    res.send("SUCCESS");
    return;
  }

  res.send(JSON.stringify(req.body));
});

app.listen(port, () => console.log(`Backend app listening on port ${port}!`));

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
      let newLines = lines;
      if (token === tokenA) {
        newLines = [...lines, newEntry.lines[0]];
        found = true;
      }

      const entry: clientEntry = { token: tokenA, lines: newLines };
      return entry
    });

    if (!found) clients[code] = [...stop, newEntry];
    else clients[code] = stopAdded;
  } else {
    clients[code] = [newEntry];
  }

  console.log(prettyjson.render(clients));
}

function updateClient(provider: string, stopCode:string, newData: clientEntry[]) {
  const code = getCode(provider, stopCode);
  clients[code] = newData;
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

  const newData = clientsArray.map(({ token, lines }) => {
    const wantedLines:line[] = lines
      .map(({ line: wantedLine, time: lastTime }) => {
        const { line, destination, time } = nextLines.find(
          ({ line }) => line === wantedLine
        );

        if (lastTime) {
          const timeDiff = Math.abs(parseInt(lastTime.replace("*", "")) - parseInt(time.replace("*", "")));
          if (timeDiff > 3) return null;
        }
        return { line, destination, time };
      })
      .flat(2)
      .filter(entry => entry !== null)
      .sort(({ time: timeA }, { time: timeB }) => {
        return (
          parseInt(timeA.replace("*", "")) - parseInt(timeB.replace("*", ""))
        );
      });

    sendMessage(token, wantedLines, stopCode);
    return { token, lines: wantedLines };
  });

  updateClient(provider, stopCode, newData);
}

async function sendMessage(token: string, lines: line[], stopCode: string) {
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
    title: stopCode
  };

  expo.sendPushNotificationsAsync([message]);
  console.log("SENT");
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
    console.log("ERROR");
    console.log(error);
  }
}
