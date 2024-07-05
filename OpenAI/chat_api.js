const text_openai = async (speech_text, chathistory, openai) => {
  try {
    // console.log("Chathistory : ", chathistory);
    const response = openai.beta.chat.completions.stream({
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      stop: ["user"],
      messages: [
        { role: "system", content: "You are a helpfull assistent." },
        { role: "assistant", content: chathistory },
        { role: "user", content: speech_text },
      ],
      stream: true,
    });
    return response;
  } catch (err) {
    console.log("Error in the text_openai function ", err);
  }
};

const text_together_api = async (speech_text, chathistory, openai, model) => {
  try {
    console.log("Chathistory : ", chathistory);
    const chat = JSON.stringify(chathistory);
    const response = await openai.chat.completions.create({
      model: model,
      // temperature: 0.3,
      // stop: ["user"],
      messages: [
        { role: "system", content: "You are a helpfull assistent." },
        { role: "assistant", content: chat },
        { role: "user", content: speech_text },
      ],
      stream: true,
    });
    return response;
  } catch (err) {
    console.log("Error in the text_openai function ", err);
  }
};

const text_groq = async (speech_text, chathistory, groq, model) => {
  try {
    // console.log("Chathistory : ", chathistory);

    console.log("Request : ", {
      model: model,
      messages: chathistory,
      stream: true,
      stop: ["user"],
      top_p: 1,
      max_tokens: 256,
      temperature: 0.5,
    });

    const response = await groq.chat.completions.create({
      model: model,
      messages: chathistory,
      stream: true,
      stop: ["user"],
      top_p: 1,
      max_tokens: 256,
      temperature: 0.5,
    });
    return response;
  } catch (err) {
    console.log("Error in the text_openai function ", err);
    return new Error("");
  }
};

const text_openai_with_gpt4 = async (speech_text, chathistory, openai) => {
  try {

    console.log("Chathistory : ", chathistory);
    const chat = JSON.stringify(chathistory);
    console.log("Chathistory : ", chat);
    console.log("Typeof Chathistory : ", typeof(chat));

    const response = openai.beta.chat.completions.stream({
      model: "gpt-4o",
      temperature: 0.3,
      stop: ["user"],
      messages: [
        { role: "system", content: "You are a helpfull assistent." },
        { role: "assistant", content: chat },
        { role: "user", content: speech_text },
      ],
      stream: true,
    });
    return response;
  } catch (err) {
    console.log("Error in the text_openai function ", err);
  }
};

module.exports = {
  text_openai,
  text_openai_with_gpt4,
  text_groq,
  text_together_api,
};
