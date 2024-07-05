const axios = require("axios");
require("dotenv").config({ path: "./config.env" });


const get_correct_text_openai = async (text) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content:
          'You are a helpful assistant. You have the following two tasks:\n1. Correct any spelling discrepancies in the transcribed text. Only add necessary punctuation such as periods, commas, and capitalization, and use only the context provided.\n2. Identify whether the transcribed text is complete in grammatical context or not.\n\nYour response should always be in the below format:\n{\n  "Corrected Transcription": "Text",\n  "Text Completion": "True"\n}\n or\n{\n"Corrected Transcription": "Text",\n  "Text Completion": "True"\n}\n\n###\n\nExample-1\n\nTranscribed Text: Hello\nResponse:\n{\n  "Corrected Transcription": "Hello.",\n  "Text Completion": "True"\n}\n\n###\n\nExample-2\n\nTranscribed Text: Let me think ah\nResponse:\n{\n  "Corrected Transcription": "Let me think, ah.",\n  "Text Completion": "False"\n}\n\n',
      },
      {
        role: "user",
        content: `Transcribed Text: ${text}\nResponse:`,
      },
      {
        role: "assistant",
        content:
          '{\n  "Corrected Transcription": "I was thinking of going tomorrow.",\n  "Text Completion": "True"\n}',
      },
    ],
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  console.log("Corrected Text : ", completion.choices[0].message.content);

  let tt = JSON.stringify(completion.choices[0].message.content);
  tt = JSON.parse(completion.choices[0].message.content);
  console.log("JSON : ", tt["Corrected Transcription"]);
  console.log("JSON : ", tt["Text Completion"]);
  return {
    text: tt["Corrected Transcription"],
    completed: tt["Text Completion"],
  };
};



const get_is_completed_together_api = async (text , openai , model) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          'You are a helpful assistant. You have the following two tasks:\n1. Correct any spelling discrepancies in the transcribed text. Only add necessary punctuation such as periods, commas, and capitalization, and use only the context provided.\n2. Identify whether the transcribed text is complete in grammatical context or not.\n\nYour response should always be in the below format:\n{\n  "Corrected Transcription": "Text",\n  "Text Completion": "True"\n}\n or\n{\n"Corrected Transcription": "Text",\n  "Text Completion": "True"\n}\n\n###\n\nExample-1\n\nTranscribed Text: Hello\nResponse:\n{\n  "Corrected Transcription": "Hello.",\n  "Text Completion": "True"\n}\n\n###\n\nExample-2\n\nTranscribed Text: Let me think ah\nResponse:\n{\n  "Corrected Transcription": "Let me think, ah.",\n  "Text Completion": "False"\n}\n\n',
      },
      {
        role: "user",
        content: `Transcribed Text: ${text}\nResponse:`,
      },
      {
        role: "assistant",
        content:
          '{\n  "Corrected Transcription": "I was thinking of going tomorrow.",\n  "Text Completion": "True"\n}',
      },
    ],
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  console.log("Corrected Text : ", completion.choices[0].message.content);

  let tt = JSON.stringify(completion.choices[0].message.content);
  tt = JSON.parse(completion.choices[0].message.content);
  console.log("JSON : ", tt["Corrected Transcription"]);
  console.log("JSON : ", tt["Text Completion"]);
  return {
    text: tt["Corrected Transcription"],
    completed: tt["Text Completion"],
  };
};

const get_correct_text_groq = async (text, groq, model) => {
  try {
    console.log("Request : ", {
      model: model,
      messages: [
        {
          role: "user",
          content: `Transcribed Text: ${text}\nResponse:`,
        },
      ],
      temperature: 0.3,
      top_p: 1,
      stream: false,
      stop: null,
    });

    const completion = await groq.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content:
            'You are a helpful assistant. You have the following two tasks:\n1. Correct any spelling discrepancies in the transcribed text. Only add necessary punctuation such as periods, commas, and capitalization, and use only the context provided.\n2. Identify whether the transcribed text, after completion in Task 1, is complete in grammatical context or not.\n\nYour response should always be in the below format:\n{\n  "Corrected Transcription": "Text",\n  "Text Completion": "True"\n}\n or\n{\n"Corrected Transcription": "Text",\n  "Text Completion": "True"\n}\n\n###\n\nExample-1\n\nTranscribed Text: Hello\nResponse:\n{\n  "Corrected Transcription": "Hello.",\n  "Text Completion": "True"\n}\n\n###\n\nExample-2\n\nTranscribed Text: Let me think ah\nResponse:\n{\n  "Corrected Transcription": "Let me think, ah.",\n  "Text Completion": "False"\n}\n\n###\n\nExample-3\n\nTranscribed Text: I was wondering, If you can tell me, how to move forward\nResponse:\n{\n  "Corrected Transcription": "I was wondering if you can tell me how to move forward?",\n  "Text Completion": "True"\n}',
        },
        {
          role: "user",
          content: `Transcribed Text: ${text}\nResponse:`,
        },
      ],
      temperature: 0.3,
      top_p: 1,
      stream: false,
      stop: null,
    });
    console.log("Corrected Text : ", completion.choices[0].message.content);

    let tt = JSON.stringify(completion.choices[0].message.content);
    tt = JSON.parse(completion.choices[0].message.content);
    console.log("JSON : ", tt["Corrected Transcription"]);
    console.log("JSON : ", tt["Text Completion"]);

    if (!tt["Corrected Transcription"] || !tt["Text Completion"]) {
      console.log("Returning error");
      return new Error("");
    }
    return {
      text: tt["Corrected Transcription"],
      completed: tt["Text Completion"],
    };
  } catch (err) {
    console.log("Error in groq text correction : ", err);
    return new Error("");
  }
};

module.exports = { get_correct_text_openai, get_correct_text_groq , get_is_completed_together_api };
