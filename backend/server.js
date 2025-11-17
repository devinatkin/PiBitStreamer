const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const app = express();

// middleware
app.use(morgan("combined")); // log requests to the console

// urlencoded middleware
// this sets the maximum size of a file that is being uploaded
app.use(express.json({ limit: "5gb" }));
app.use(express.urlencoded({ limit: "5gb", extended: true }));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

app.use("/api/ping", (req, res) => {
  res.status(200).send("status: ok");
});
app.use("/api/boards", require("./routes/boardsRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// set up server to listen on specific port
const port = 5000;
app.listen(port, () => console.log(`Server started on port ${port}`));
