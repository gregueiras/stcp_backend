var chakram = require('chakram'),
    expect = chakram.expect;

const responseSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          "line": "string",
          "destination": "string",
          "time": "string",
          "remainingTime": "string",
        }
      }
    }
const url = "http://localhost:3000/stops"


describe("API", function () {
  this.slow(2000)
  it("METRO correct cases/accents", function () {
    let data = {
      "provider": "METRO DO PORTO",
      "code": "Fórum Maia"
    }

    const response = chakram.post(url, data);

    expect(response).to.have.status(200);
    expect(response).to.have.header("content-type", "application/json; charset=utf-8");
    expect(response).not.to.be.encoded.with.gzip;
    expect(response).to.have.schema(responseSchema);
    return chakram.wait();
  });

  it("METRO incorrect cases/accents", function () {
    let data = {
      "provider": "METRO DO PORTO",
      "code": "fOrUm MaIa"
    }

    const response = chakram.post(url, data);

    expect(response).to.have.status(200);
    expect(response).to.have.header("content-type", "application/json; charset=utf-8");
    expect(response).not.to.be.encoded.with.gzip;
    expect(response).to.have.schema(responseSchema);
    return chakram.wait();
  });

  it("STCP correct cases/accents", function () {
    let data = {
      "provider": "STCP",
      "code": "BCM1"
    }

    const response = chakram.post(url, data);

    expect(response).to.have.status(200);
    expect(response).to.have.header("content-type", "application/json; charset=utf-8");
    expect(response).not.to.be.encoded.with.gzip;
    expect(response).to.have.schema(responseSchema);
    return chakram.wait();
  });

  it("consecutive searches should be really fast", function () {
    let data = {
      "provider": "STCP",
      "code": "BCM1"
    }

    const response = chakram.post(url, data);

    expect(response).to.have.status(200);
    expect(response).to.have.header("content-type", "application/json; charset=utf-8");
    expect(response).not.to.be.encoded.with.gzip;
    expect(response).to.have.schema(responseSchema);
    return chakram.wait().then(() => {
        const resp = chakram.post(url, data);

        expect(resp).to.have.status(200);
        expect(resp).to.have.header("content-type", "application/json; charset=utf-8");
        expect(resp).not.to.be.encoded.with.gzip;
        expect(resp).to.have.schema(responseSchema);
        expect(resp).to.have.responsetime(100);

        return chakram.wait()
    });
  });

}); 