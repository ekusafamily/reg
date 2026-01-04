require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const pool = require("./db");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

console.log("🚀 Registration bot online");

// user session storage (in-memory)
const sessions = {};

const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Telegram bot is running , ohhh yeees 😁 ohhhh yeeessss🤣🤣🤣, oneterm");
});

app.listen(PORT, () => {
  console.log(`🌐 Mock server listening on port ${PORT}`);
});
// steps enum
const STEPS = {
  NAME: "name",
  EMAIL: "email",
  PHONE: "phone",
  SCHOOL: "school",
  REGNO: "regno",
  YEAR: "year"
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  sessions[chatId] = {
    telegram_id: msg.from.id,
    reg_date: new Date().toISOString().split("T")[0],
    step: STEPS.NAME
  };

  bot.sendMessage(chatId, "📝 Registration started\n\nEnter your full name:");
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const session = sessions[chatId];
  if (!session || msg.text?.startsWith("/")) return;

  switch (session.step) {
    case STEPS.NAME:
      session.name = msg.text;
      session.step = STEPS.EMAIL;
      return bot.sendMessage(chatId, "📧 Enter your school email:");

    case STEPS.EMAIL:
      session.email = msg.text;
      session.step = STEPS.PHONE;
      return bot.sendMessage(chatId, "📞 Enter your phone number:");

    case STEPS.PHONE:
      session.phone = msg.text;
      session.step = STEPS.SCHOOL;
      return bot.sendMessage(chatId, "🏫 Select your school:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "School of Engineering", callback_data: "school_SoE" }],
            [{ text: "School of Business", callback_data: "school_SoB" }],
            [{ text: "School of Science", callback_data: "school_SoS" }],
            [{ text: "School of Geospatial", callback_data: "school_GEOSPATIAL" }]
          ]
        }
      });

    case STEPS.REGNO:
      session.reg_number = msg.text;
      session.step = STEPS.YEAR;
      return bot.sendMessage(chatId, "📚 Select your year of study:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Year 1", callback_data: "year_1" }],
            [{ text: "Year 2", callback_data: "year_2" }],
            [{ text: "Year 3", callback_data: "year_3" }],
            [{ text: "Year 4", callback_data: "year_4" }],
            [{ text: "Year 5", callback_data: "year_5" }]
          ]
        }
      });
  }
});

bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const session = sessions[chatId];
  if (!session) return;

  if (q.data.startsWith("school_")) {
    session.school = q.data.replace("school_", "");
    session.step = STEPS.REGNO;

    bot.answerCallbackQuery(q.id);
    return bot.sendMessage(chatId, "🆔 Enter your registration number:");
  }

  if (q.data.startsWith("year_")) {
    session.year = Number(q.data.replace("year_", ""));

    try {
      await pool.query(
        `INSERT INTO registrations
        (telegram_id, reg_date, name, email, phone, school, reg_number, year)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          session.telegram_id,
          session.reg_date,
          session.name,
          session.email,
          session.phone,
          session.school,
          session.reg_number,
          session.year
        ]
      );

      bot.answerCallbackQuery(q.id);
      bot.sendMessage(chatId, "✅ Registration complete. Thank you!");
      delete sessions[chatId];

    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ Failed to save registration.");
    }
  }
});
