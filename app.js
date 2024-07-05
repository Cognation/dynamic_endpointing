const express = require('express')
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require('path');

require("dotenv").config({ path: "./config.env" });


const app = express();
require("express-ws")(app);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
const port = 8080;


app.use(express.json());
app.get("/", (req, res) => {
  res.send("Streaming Whisper server is running... ");
});


const {audio_stream} = require('./routes/audio_together_api');

app.ws('/' , (req , res)=>{
  res.send("Websocket Working Fine.")
});

app.ws(
  "/audio",
  audio_stream
);

app.use('/audio_files', express.static(path.join(__dirname, 'audio')));

app.listen(port, () => {
  console.log(`App listening on port http://localhost:${port}`)
})
