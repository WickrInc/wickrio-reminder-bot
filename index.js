const wickr = require('wickrio_addon')

const ReminderBot = require('./lib/reminder-bot')

async function main() {
  let bot = new ReminderBot(wickr)
  bot.start()
}

main().then(() => {}).catch(e => { console.error(e); process.exit(1) })
