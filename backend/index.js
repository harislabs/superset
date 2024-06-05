const PORT = 3731;

const express = require("express");
const cors = require("cors");

const app = express();
// app.use(cors());
// app.use(cors({ credentials: true, origin: "https://superapp.acruxtek.net" }));
app.use(cors({ credentials: true, origin: "http://localhost:3001" }));

app.get("/guest-token", getGuestToken);

app.listen(process.env.PORT || PORT, () => {
  console.log(`server listening on port ${process.env.PORT || PORT}`);
});

async function getGuestToken(req, res) {
  try {
    const resp = await fetchGuestToken();

    if (resp?.ckie) {
      // Use res.cookie to set the cookie in the response
      res.cookie("XSRF-TOKEN", resp?.ckie, {
        secure: true,
        SameSite: "none",
      });
      //Sres.cookie("session", resp?.ckie);
      res.setHeader("X-CSRF-TOKEN", resp?.csrfToken);
    }

    console.log("guest token responseeee", resp);

    res.status(200).json(resp);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function fetchAccessToken() {
  try {
    const body = {
      username: "admin",
      password: "acrux931",
      provider: "db",
      refresh: true,
    };

    const response = await fetch(
      "https://ss.acruxtek.net/api/v1/security/login",
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const jsonResponse = await response.json();
    //console.log("jsnosss response", jsonResponse);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch access token. Status: ${response.status}`
      );
    }

    return jsonResponse?.access_token;
  } catch (error) {
    console.error(error);
    throw new Error("Error fetching access token");
  }
}

async function getCsrfToken(accessToken) {
  try {
    const response = await fetch(
      "https://superset.acruxtek.net/api/v1/security/csrf_token/",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const jsonResponse = await response.json();
    //console.log("jsnosss response csrf: ", response.headers.get("set-cookie"));

    const responseFinal = {
      csrf: jsonResponse.result,
      ckie: response.headers.get("set-cookie"),
    };

    //console.log("response final", responseFinal);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch access token. Status: ${response.status}`
      );
    }

    return responseFinal;
  } catch (error) {
    console.error(error);
    throw new Error("Error fetching access token");
  }
}

async function fetchGuestToken() {
  const accessToken = await fetchAccessToken();
  const csrfToken = await getCsrfToken(accessToken);
  //console.log("token recieved access:", accessToken);
  //console.log("token recieved csrf: ", csrfToken);
  try {
    const body = {
      resources: [
        {
          type: "dashboard",
          //id: "4102a7b6-e3b6-40cb-a3c9-8796b5cc70db",
          id: "b374237b-7e5e-4d33-8d3b-7544b0e62fb6",
        },
      ],
      rls: [],
      user: {
        username: "guest",
        first_name: "Guest",
        last_name: "User",
      },
    };

    const bodyString = JSON.stringify(body);
    console.log("fetching guest token I");
    const response = await fetch(
      "https://superset.acruxtek.net/api/v1/security/guest_token/",
      {
        method: "POST",
        body: bodyString,
        headers: {
          "Content-Type": "application/json",
          //"Content-Length": Buffer.byteLength(bodyString),
          Authorization: `Bearer ${accessToken}`,
          "X-CSRF-TOKEN": csrfToken.csrf,
          Cookie: csrfToken.ckie,
        },
      }
    );
    console.log("fetching guest token II");

    const jsonResponse = await response.json();

    //console.log("guest token responseeee", jsonResponse);

    const responseFinal = {
      token: jsonResponse?.token,
      ckie: response.headers.get("set-cookie"),
      csrfToken: csrfToken.csrf,
    };

    //console.log("csrf", csrfToken.ckie);
    //console.log("guest", responseFinal.ckie);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch guest token. Status: ${response.status}`
      );
    }

    return responseFinal;
  } catch (error) {
    console.error(error);
    throw new Error("Error fetching guest token");
  }
}
