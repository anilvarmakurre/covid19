const express = require("express");
const app = express();

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(express.json());
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let database = null;

const initializeDBandServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running....");
    });
  } catch (error) {
    console.log(`error message '${error.message}'`);
  }
};

initializeDBandServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const tokenValidating = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUser = `
    SELECT * FROM user WHERE username='${username}';`;
  const dbUser = await database.get(checkUser);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      console.log(jwtToken);
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/states/", tokenValidating, async (request, response) => {
  const getQuery = `SELECT * FROM state;`;
  const getResponse = await database.all(getQuery);
  response.status(200);
  console.log(getResponse);
  response.send(getResponse);
});

// app.get("/states/", async (request, response) => {
//   const getQuery = `SELECT * FROM state;`;

//   const getResponse = await database.all(getQuery);
//   console.log(getResponse);
//   response.send(
//     getResponse.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
//   );
// });

app.get("/states/:stateId/", tokenValidating, async (request, response) => {
  const { stateId } = request.params;
  console.log(stateId);
  const getQuery = `SELECT * FROM state WHERE state_id=${stateId};`;
  const getResponse = await database.get(getQuery);
  console.log(getResponse);
  response.send(convertDbObjectToResponseObject(getResponse));
});

app.post("/districts/", tokenValidating, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postQuery = `
    INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
    values ('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}');`;
  const postResponse = await database.run(postQuery);
  console.log(postResponse);
  response.send("District Successfully Added");
});

app.get(
  "/districts/:districtId/",
  tokenValidating,
  async (request, response) => {
    const { districtId } = request.params;
    const getQuery4 = `
    SELECT * FROM district WHERE district_id=${districtId};`;
    const getResponse4 = await database.get(getQuery4);
    console.log(getResponse4);
    response.send(convertDbObjectToResponseObject(getResponse4));
  }
);

app.delete(
  "/districts/:districtId/",
  tokenValidating,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteQuery = `
    DELETE  FROM district WHERE district_id = ${districtId};`;
    const deleteResponse = await database.run(deleteQuery);
    console.log(deleteResponse);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  tokenValidating,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const putQuery = `UPDATE district SET 
    district_name='${districtName}',
    state_id='${stateId}',
    cases='${cases}',
    cured='${cured}',
    active='${active}',
    deaths='${deaths}';`;
    const putResponse = await database.run(putQuery);
    console.log(putResponse);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  tokenValidating,
  async (request, response) => {
    const { stateId } = request.params;
    const getQuery = `
    SELECT sum(cases) as totalCases,
    sum(cured) as totalCured,
    sum(active) as totalActive,
    sum(deaths) as totalDeaths FROM district WHERE state_id='${stateId}';`;
    const getResponse = await database.get(getQuery);
    console.log(getResponse);
    response.send(getResponse);
  }
);

// app.get("/districts/:districtId/details/", async (request, response) => {
//   const { districtId } = request.params;
//   console.log(districtId);
//   const getQuery8 = `
//     SELECT state.state_name as stateName FROM state INNER JOIN
//     district ON state.state_id = district.state_id
//      WHERE district_id=${districtId};`;
//   const getResponse8 = await database.get(getQuery8);
//   console.log(getResponse8);
//   response.send(getResponse8);
// });
module.exports = app;
