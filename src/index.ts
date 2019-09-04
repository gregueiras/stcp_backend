const express = require("express");
const moment = require("moment");

const app = express();
const port = process.env.PORT || 3000;

const clients: {
  token: String;
  expire: Date;
  stopCode: String;
  provider: String;
  line: String[];
}[] = []; // stop is key, value is array of objects with keys token and

app.post("/", (req, res) => {
  console.log(req.query);

  if (req.query.token) {
    const { token, expire = 10, stopCode, provider, line } = req.query;

    const expirationTime = moment().add(expire, "minutes");

    clients.push({
      token,
      stopCode,
      provider,
      line,
      expire: expirationTime
    });
    console.log(clients)
    res.send(JSON.stringify(expirationTime));
    return;
  }
  
  res.send(JSON.stringify(req.query));
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
