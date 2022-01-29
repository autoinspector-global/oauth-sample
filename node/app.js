const express = require("express");
const expressHBS = require("express-handlebars");
const Autoinspector = require("autoinspector").default;
const dotenv = require("dotenv");
const cookieSession = require("cookie-session");

dotenv.config({
  path: ".env",
});

const autoinspector = new Autoinspector({
  apikey: process.env.AUTOINSPECTOR_API_KEY,
  oauthCredentials: {
    client_secret: process.env.AUTOINSPECTOR_CLIENTAPP_SECRET,
    client_app_id: process.env.AUTOINSPECTOR_CLIENTAPP_ID,
  },
});

const app = express();

app.use(
  cookieSession({
    secret: "SECURE_SECRET",
  })
);
app.engine("handlebars", expressHBS.engine());
app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.json());

app.use(express.static(__dirname));

app.get("/", async (req, res) => {
  const isConnected = !!req.session.access_token;
  const hasToFetchInspections = req.query.with_inspections === "true";

  if (isConnected && hasToFetchInspections) {
    try {
      const memberships = await autoinspector.oauth.user.memberships.list({
        access_token: req.session.access_token,
      });
      const randomIndex = Math.floor(Math.random() * memberships.length);
      const randomMembership = memberships[randomIndex];

      const inspections = await autoinspector.oauth.user.inspections.list({
        membershipId: randomMembership._id,
        access_token: req.session.access_token,
      });

      return res.render("home", {
        isConnected,
        client_app_id: process.env.AUTOINSPECTOR_CLIENTAPP_ID,
        autoinspectorDashboardBaseURL:
          process.env.AUTOINSPECTOR_DASHBOARD_BASE_URL,
        inspections: inspections.inspections,
      });
    } catch (err) {
      console.log("error when get inspections!", err);
      return res.render("error");
    }
  }

  res.render("home", {
    client_app_id: process.env.AUTOINSPECTOR_CLIENTAPP_ID,
    isConnected,
    autoinspectorDashboardBaseURL: process.env.AUTOINSPECTOR_DASHBOARD_BASE_URL,
  });
});

app.get("/oauth/exchange", (req, res) => {
  const query = req.query;

  autoinspector.oauth
    .exchangeCodeForAccessToken({
      code: query.code,
    })
    .then((data) => {
      console.log("code exchanged for access token:", data);
      req.session.access_token = data.access_token;
      res.redirect("/");
    })
    .catch((err) => {
      console.log("error!", err);
      res.send("Something wrong happend!");
    });
});

app.listen(process.env.PORT, () => {
  console.log("SERVER LISTENING ON PORT:", process.env.PORT);
});
