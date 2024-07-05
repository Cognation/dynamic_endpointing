const path = require("path");
const fs = require("fs-extra");
const isBuffer = require("is-buffer");
const wav = require("wav");
require("dotenv").config({ path: "./config.env" });
const fetch = require("cross-fetch");
const Groq = require("groq-sdk");
const {get_is_completed_together_api} = require("../OpenAI/is_completed");
const { text_openai, text_groq , text_together_api , text_openai_with_gpt4} = require("../OpenAI/chat_api");
const OpenAI = require("openai");

const together_api_client = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: "https://api.together.xyz/v1",
});

const openai_client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const audio_stream = (wss, req) => {
  try{
  console.log("Client connected");

  const sampleRate = 16000;
  const numChannels = 1; // Mono audio
  const bitDepth = 16;
  const endianness = "LE"; // Little Endian
  const outputFilePath = "output.wav";
  const outputStream = fs.createWriteStream(outputFilePath);

  const wavWriter = new wav.FileWriter(outputFilePath, {
    channels: numChannels,
    sampleRate: sampleRate,
    bitDepth: bitDepth,
    endianness: endianness,
  });

  wavWriter.pipe(outputStream);

  const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");

  async function delay(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  let recording = false;
  let rawarray = [];
  let chathistory = [
    { role: "system", content: "You are a helpfull assistent." },
  ];
  let session_id = "";
  let tts = "deepgram";
  let stt = "deepgram";
  let isfinal_model = "mixtral-8x7b-32768";
  let chat_model = "mixtral-8x7b-32768";
  let endp = 300;
  let count = 0;
  let hasaudio = false;
  let can_send = true;
  let transcribed_text = "";
  let play;
  let can_write = true;
  let pop = 0;
  let playing = false;
  let writeStream;
  let can_send_text = true;

  let connection;
  let client;
  let call;
  let lang = "en-US";

  const filePath = "outputt.wav";
  let fileWriter = new wav.FileWriter(filePath, {
    channels: 1, // Number of audio channels
    sampleRate: 16000, // Sample rate (Hz)
    bitDepth: 16, // Bit depth
  });

  if (!fs.existsSync(`./audio`)) {
    fs.mkdirSync(`./audio`);
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const call_open_ai = async (input_text, chathistory) => {
    try {

      console.log("Input Text : " , input_text);


      const response = await text_together_api(
        input_text,
        chathistory,
        together_api_client,
        chat_model
      );
      let text = "";
      let history = "";
      for await (const chunk of response) {
        let content = chunk.choices[0]?.delta?.content;
        if (content && content != undefined && content != "undefined") {
          history += content;
          // if (
          //   content.includes(".") ||
          //   content.includes("!") ||
          //   content.includes("?")
          // ) {
          //   text += content;
          //   audio_api(text);
          //   console.log("Calling Audio Api.");
          //   text = "";
          // } else {
          //   text += content;
          // }
          text += content;
        }
      }
      if (text && text != undefined && text != "undefined") {
        chathistory.push({
          role: "assistant",
          content: text,
        });
        if (tts === "playht") {
          wss.send(JSON.stringify({ type: "llm", msg: text }));
          audio_api(text);
          text = "";
        } else {
          wss.send(JSON.stringify({ type: "llm", msg: text }));
          audio_api_deepgram(text);
          text = "";
        }
      }
    } catch (err) {
      console.log("Error in openai in audio : ", err);
    }
  };

  let filenumber = -1;

  const audio_api = async (textt) => {
    try {
      const url = "https://api.play.ht/api/v2/tts/stream";
      const api_key = process.env.PLAYHT_API_KEY;
      const user_id = process.env.PLAYHT_USER_ID;
      const options = {
        method: "POST",
        headers: {
          accept: "audio/mpeg",
          "content-type": "application/json",
          AUTHORIZATION: api_key,
          "X-USER-ID": user_id,
        },
        body: JSON.stringify({
          voice_engine: "PlayHT2.0-turbo",
          text: textt,
          voice:
            "s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json",
          output_format: "mp3",
          sample_rate: "44100",
          speed: 1,
        }),
      };

      filenumber += 1;

      console.log("Calling audio.");

      const response = await fetch(url, options);
      console.log("Called audio.");
      const readableStream = response.body;

      // Pipe the readable stream to a writable stream, this can be a local file or any other writable stream
      const folderPath = "./audio";
      if (!fs.existsSync(`./audio`)) {
        fs.mkdirSync(`./audio`);
      }

      const filePath = path.join(
        folderPath,
        session_id,
        `audio${filenumber}.mp3`
      );
      readableStream.pipe(fs.createWriteStream(filePath));
      readableStream.on("finish", async () => {
        // await delay(1500);
        console.log("FileNumber: ", filenumber);
        wss.send(JSON.stringify({ type: "file", number: filenumber }));
        can_write = true;
        playing = false;
      });
    } catch (err) {
      console.log("Error in Play.ht or sending audio file : ", err);
    }
  };

  const audio_api_deepgram = (text) => {
    const url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en";
    const apiKey = process.env.DEEPGRAM_KEY;

    const textToSpeak = text;
    const data = JSON.stringify({
      text: textToSpeak,
    });

    const options = {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: data,
    };

    filenumber += 1;

    fetch(url, options)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        const folderPath = "./audio";
        if (!fs.existsSync(`./audio`)) {
          fs.mkdirSync(`./audio`);
        }
        const filePath = path.join(
          folderPath,
          session_id,
          `audio${filenumber}.mp3`
        );
        const dest = fs.createWriteStream(filePath);
        res.body.pipe(dest);
        dest.on("finish", () => {
          console.log("FileNumber: ", filenumber);
          wss.send(JSON.stringify({ type: "file", number: filenumber }));
          console.log("File saved successfully.");
          can_write = true;
          playing = false;
        });
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  wss.on("message", async (message) => {
    // if(transcriptt){
    //   wss.send(transcriptt);
    //   transcriptt = "";
    // }
    if (message === "Start") {
      const filePath = "outputt.wav";
      if (stt == "whisper") {
        writeStream = fs.createWriteStream(filePath);
      }
      filenumber = -1;
      console.log("Clearing the raearray.");
      rawarray = [];
      can_write = true;

      const deep_language = lang;
      console.log("Languageee ", deep_language);

      if (stt === "deepgram") {
        const deepgram = createClient(process.env.DEEPGRAM_KEY);

        connection = deepgram.listen.live({
          punctuate: true,
          interim_results: true,
          encoding: "linear16",
          sample_rate: 16000,
          language: deep_language,
          model: "nova-2",
          speech_final: true,
        });
      } else {
        // client = await new proto.ASR(
        //   "35.202.216.98:5051",
        //   grpc.credentials.createInsecure(),
        //   {
        //     "grpc.keepalive_timeout_ms": 2 * 60 * 60 * 1000, // 2 hours in miliseconds
        //     "grpc.keepalive_time_ms": 20 * 1000, // 20s in miliseconds
        //     "grpc.keepalive_permit_without_calls": true,
        //     "grpc.max_connection_idle_ms": 15 * 60 * 1000, // 15 minutes in miliseconds
        //     "grpc.http2.max_pings_without_data": 0, // disabled
        //   }
        // );
        // call = client.StreamASR();
      }
      const outputFile = "./output.wav";

      // await delay(2000);

      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
        console.log("Unlink Succesfully.");
      }
      console.log("Start");
      recording = true;

      if (stt === "deepgram") {
        connection.on(LiveTranscriptionEvents.Open, () => {
          console.log(LiveTranscriptionEvents.Open);
          connection.on(LiveTranscriptionEvents.Close, () => {
            console.log("Connection closed.");
          });

          connection.on(LiveTranscriptionEvents.Transcript, async (data) => {
            if (data.is_final && data.speech_final && !playing) {
              const text = data?.channel?.alternatives[0]?.transcript;
              if (text && can_send_text) {
                transcribed_text += " " + text;
                console.log("Transcript  :  ", text);
                pop += 1;
                if (pop >= 2) {
                  wss.send(JSON.stringify({ type: "pop", msg: "pop" }));
                }
                wss.send(
                  JSON.stringify({ type: "transcript", msg: transcribed_text })
                );
                let textt;
                try {

                  console.log("Sending to together api : " , transcribed_text);
                  textt = await get_is_completed_together_api(
                    transcribed_text,
                    openai_client,
                    isfinal_model
                  );
                } catch (err) {
                  console.log("Erron in audio_groq text correction : ", err);
                }
                console.log("Text Completion : ", transcribed_text);
                if (textt.completed == "True") {
                  can_send_text = false;
                  setTimeout(() => {
                    can_send_text = true;
                  }, endp);
                  pop = 0;
                  wss.send(
                    JSON.stringify({ type: "transcript", msg: textt.text })
                  );
                  playing = true;
                  chathistory.push({
                    role: "user",
                    content: textt.text,
                  });
                  call_open_ai(textt.text, chathistory);
                  transcribed_text = "";
                } else {
                  // if(textt.text){
                  //   transcribed_text += textt.text;
                  // }
                }
              }
            }
          });

          connection.on(LiveTranscriptionEvents.Metadata, (data) => {
            console.log(data);
          });

          connection.on(LiveTranscriptionEvents.Error, (err) => {
            console.error(err);
          });
        });
      }

      if (stt == "whisper") {
        // call.on("data", (response) => {
        //   response.transcript
        //     ? console.log("whisper Response : ", response.transcript)
        //     : null;
        //   if (response.transcript) {
        //     transcribed_text += " " + response.transcript;
        //     wss.send(
        //       JSON.stringify({ type: "transcript", msg: transcribed_text })
        //     );
        //     // const textt = await get_correct_text.get_correct_text(
        //     //   transcribed_text
        //     // );
        //     // if (textt.completed == "True") {
        //     //   if (stt === "whisper") {
        //     //     can_write = false;
        //     //     setTimeout(async() => {
        //     //       // call.end();
        //     //     }, 200);
        //     //   }
        //     //   // wss.send(
        //     //   //   JSON.stringify({ type: "transcript", msg: textt.text })
        //     //   // );
        // chathistory.push({
        //     "role": "user",
        //     "content": textt.text
        // });
        //     //   chathistory += `user : ${textt.text}\n`;
        //     //   call_open_ai(textt.text, chathistory);
        //     //   transcribed_text = "";
        //     // }
        //   }
        // });
        // call.on("end", () => {
        //   resolve();
        // });
      }
    }

    if (typeof message == "string" && message.substring(0, 8) == "Language") {
      // console.log("Language " , message.substring(9));
      lang = message.substring(9);
      console.log("Language : ", lang);
    }

    if (typeof message == "string" && message.substring(0, 3) == "stt") {
      // console.log("Language " , message.substring(9));
      stt = message.substring(3);
      console.log("stt : ", stt);
    }

    if (typeof message == "string" && message.substring(0, 3) == "tts") {
      // console.log("Language " , message.substring(9));
      tts = message.substring(3);
      console.log("tts : ", tts);
    }
    if (
      typeof message == "string" &&
      message.substring(0, 13) == "isfinal_model"
    ) {
      // console.log("Language " , message.substring(9));
      isfinal_model = message.substring(13);
      console.log("isfinal_model : ", isfinal_model);
    }
    if (
      typeof message == "string" &&
      message.substring(0, 10) == "chat_model"
    ) {
      // console.log("Language " , message.substring(9));
      chat_model = message.substring(10);
      console.log("chat_model : ", chat_model);
    }
    if (
      typeof message == "string" &&
      message.substring(0, 11) == "endpointing"
    ) {
      // console.log("Language " , message.substring(9));
      endp = Number(message.substring(11));
      console.log("endpointing : ", endp);
    }

    if (typeof message == "string" && message.substring(0, 2) == "id") {
      // console.log("Language " , message.substring(9));
      session_id = message.substring(3);
      console.log("Session id : ", session_id);
      if (!fs.existsSync(`./audio`)) {
        fs.mkdirSync(`./audio`);
      }
      if (!fs.existsSync(`./audio/${session_id}`)) {
        fs.mkdirSync(`./audio/${session_id}`);
      }
    }

    if (message === "Stop") {
      console.log("Stop");
      recording = false;
      if (stt === "whisper") {
        can_write = false;
        // call.end();
      }

      // console.time("Writting_user_data_to_file");

      // file = fs.createWriteStream("./output1.wav");
      // file.write(
      //   header(((16000 * rawarray.length) / 50) * 2, {
      //     sampleRate: 16000,
      //     channels: 1,
      //     bitDepth: 16,
      //   })
      // );
      // rawarray.forEach(function (data) {
      //   file.write(data);
      // });
      // console.timeEnd("Writting_user_data_to_file");

      // file.end(async () => {
      //   console.log("File Writing completed.");
      //   // await whisper_tts();
      // });
    }

    // console.log("Received:", message);

    if (isBuffer(message) && recording) {
      if (typeof message === "string" && stt === "deepgram") {
        if (connection.getReadyState() == 1) {
          console.log("String Recivied");
        }
      } else {
        if (stt === "deepgram" && connection.getReadyState() == 1) {
          connection.send(message);
          // console.log("Sending to depgram...");
        }
        if (stt === "whisper") {
          rawarray.push(message);
          if (silence.silence_check(message)) {
            if (count > 20 && hasaudio && can_send) {
              fileWriter.end(async () => {
                can_write = false;
                can_send = false;
                count = 0;
                hasaudio = false;
                console.log("Writing completed");

                console.log("File Writing completed.");
                let text = await Aman_Whisper.speech_to_text();
                // let text = await Whisper.whisper_tts(openai);
                can_send = true;
                if (text) {
                  transcribed_text += " " + text;
                  console.log("Transcript  :  ", text);
                  pop += 1;
                  if (pop >= 2) {
                    wss.send(JSON.stringify({ type: "pop", msg: "pop" }));
                  }
                  wss.send(
                    JSON.stringify({
                      type: "transcript",
                      msg: transcribed_text,
                    })
                  );
                  let textt;
                  try {
                    textt = await get_correct_text.get_correct_text_groq(
                      transcribed_text,
                      groq,
                      isfinal_model
                    );
                  } catch (err) {
                    console.log("Error in audio_groq corrected text : ", err);
                  }
                  console.log("Text Completion : ", transcribed_text);
                  if (textt.completed == "True") {
                    pop = 0;
                    // wss.send(
                    //   JSON.stringify({ type: "transcript", msg: textt.text })
                    // );
                    playing = true;
                    chathistory.push({
                      role: "user",
                      content: textt.text,
                    });
                    call_open_ai(textt.text, chathistory);
                    transcribed_text = "";
                  }
                  can_write = true;
                  fileWriter = new wav.FileWriter(filePath, {
                    channels: 1, // Number of audio channels
                    sampleRate: 16000, // Sample rate (Hz)
                    bitDepth: 16, // Bit depth
                  });
                } else {
                  can_write = true;
                  // await delay(2000);
                  fileWriter = new wav.FileWriter(filePath, {
                    channels: 1, // Number of audio channels
                    sampleRate: 16000, // Sample rate (Hz)
                    bitDepth: 16, // Bit depth
                  });
                }
              });
            } else {
              count++;
              console.log("Count : ", count);
            }
          } else {
            count = 0;
            hasaudio = true;
            // rawarray.push(message);
            if (can_write) {
              fileWriter.write(message);
              console.log("Writing...");
            }
          }
        }

        // if (stt === "whisper") {
        //   // console.log("Can Write...   " , can_write);
        // if (message && can_write) {
        //     // console.log("Writing...   ");
        //     // call.write({ audio_chunk: message });
        //     // call.write({
        //     //   hot_words: "yes this is him speaking, how can i help you?",
        //     // });
        //   }
        // }
      }
    }
  });

  // const interval = setInterval(() => {
  //   wss.send("message", "Hello");
  // }, 1000);

  wss.on("close", () => {
    console.log("Client disconnected");
    const folder = "./audio";
    if (fs.existsSync(`${folder}`)) {
      const ff = path.join(folder, session_id);
      if (fs.existsSync(`${ff}`)) {
        fs.removeSync(`${ff}`);
      }
    }
    // clearInterval(interval); // Clear interval when client disconnects
  });
}catch(err){
  console.log("Error in audio stream function.",err);
}
};

module.exports = { audio_stream };
