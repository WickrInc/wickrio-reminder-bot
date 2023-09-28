const WickrBot = require('wickrbot')
const uuid = require('uuid')

const Reminder = require('./reminder')

const CHECK_INTERVAL = 30000

class ReminderBot extends WickrBot {
  constructor(wickr, username) {
    super(wickr, username)
    this.reminders = []
    this.statePath = 'reminderbot/state'
    this.helpText = 'Use `/remind` to set a reminder for this room. When the time arrives, I will send a message ' +
            'here to make sure you don\'t forget. Here are a few examples:\n\n' +
            '• /remind me to feed Butters in 30 minutes\n' +
            '• /remind tomorrow to wish Arneil a happy birthday\n' +
            '• /remind me to watch webinar at 3:00pm\n\n' +
            'Absolute times (e.g. 3:00pm) are in Eastern Time, but you can specify a timezone too:\n' +
            '• /remind me there\'s a fork in the microwave at 2:40pm CDT'

    this.listen('remind', (msg, args) => {
      if (args.length === 0) {
        return
      }

      try {
        var reminder = new Reminder(msg, args.join(' '))
      } catch (error) {
        console.error('Error scheduling reminder:', error)
        this.send(msg.vgroupid, error)
        return
      }

      if (reminder) {
        console.log('Saving reminder:',  reminder)
        this.add(reminder)
        this.saveState()
        // TODO(dw) better formatting of this date
        this.send(msg.vgroupid, `Okay! I'll remind you ${reminder.infinitive ? 'to ' : ''}"${reminder.action}" at ${reminder.date}`)
      }
    })

    this.listen('list', (msg) => {
      this.send(msg.vgroupid, this.list(msg))
    })

    this.listen('delete', (msg, args) => {
      let index = parseInt(args[0])
      if (!index) {
        this.send(msg.vgroupid, 'Unable to parse reminder index')
        return
      }

      // -1 to convert from 1-indexed selection
      let reminder = this.remove(msg.vgroupid, index-1)
      if (reminder) {
        this.saveState()
        this.send(msg.vgroupid, `Okay. I deleted the reminder "${reminder.action}"`)
      } else {
        this.send(msg.vgroupid, 'Sorry. I couldn\'t find a reminder with that ID.')
      }
    })

    // Clear out any old reminders
    this.getRemindersToNotify()

    // Wait for bot to start before interacting with Wickr APIs
    this.on('start', () => {
      this.loadState()
      this.timer = setInterval(this.notify.bind(this), CHECK_INTERVAL)
    })
  }

  notify() {
    console.log('Starting notification check', new Date())

    let reminders = this.getRemindersToNotify()
    if (reminders.length === 0) {
      return
    }

    console.log(`Sending ${reminders.length} reminders`)
    reminders.forEach(r => this.sendReminder(r))

    console.log(`Sent ${reminders.length} reminders. Saving state.`)
    this.saveState()
  }

  add(reminder) {
    // Accept a supplied ID for testing purposes
    if (!reminder.id) {
      reminder.id = uuid.v4()
    }

    if (this.reminders.length === 0) {
      this.reminders.push(reminder)
      return
    }

    // find the first reminder *after* this one, and insert before it
    let index = this.reminders.findIndex(r => r.date > reminder.date)

    if (index >= 0) {
      this.reminders.splice(index, 0, reminder)
    } else {
      this.reminders.push(reminder)
    }
  }

  // remove the nth (zero-indexed, sorted by date) reminder for a room
  remove(vgroupid, index) {
    if (index < 0) {
      return null
    }

    let reminders = this.getRemindersForVgroup(vgroupid)

    if (index > (reminders.length-1)) {
      return null
    }

    return this.deleteReminder(reminders[index].id)
  }

  list(msg) {
    let resp = 'Upcoming reminders:\n\n'
    let reminders = this.getRemindersForVgroup(msg.vgroupid)
    let len = reminders.length
    // Maximum # of reminders to list, > 20 requires jumping code points for the "fancy" numbers
    let limit = 20
    let codePoint = 0x2460 // Unicode ①

    if (len === 0) {
      return 'No reminders found'
    }

    for (let i = 0; i < len && i < limit; i++) {
      let r = reminders[i]
      let fancyNumber = String.fromCodePoint(codePoint+i)
      resp += `${fancyNumber} ${r.infinitive ? 'To ' : ''}"${r.action}" at ${r.date}\n`
    }

    return resp.trim()
  }

  getRemindersToNotify() {
    let index = 0
    let now = new Date()

    if (this.reminders.length === 0) {
      return []
    } else if (this.reminders[this.reminders.length-1].date <= now) {
      // all of the reminders are due
      index = this.reminders.length
    } else {
      index = this.reminders.findIndex(r => r.date > now)
    }

    return this.reminders.splice(0, index)
  }

  getRemindersForVgroup(vgroupid) {
    return this.reminders.filter(r => r.vgroupid === vgroupid)
  }

  _createSnoozeButtons(reminder) {
    const reminderText = `${reminder.infinitive ? 'to ' : ''}${reminder.action}`
    const snoozeLengths = [
      {
        buttonText: '20m',
        msgText: 'in 20 minutes',
      },
      {
        buttonText: '1h',
        msgText: 'in 1 hour',
      },
      {
        buttonText: '3h',
        msgText: 'in 3 hours',
      },
    ]

    const dayOfWeek = new Date().getDay()

    // Give the option to snooze until Monday on Fri/Sat/Sun
    if (dayOfWeek === 0 || dayOfWeek > 4) {
      snoozeLengths.push({ buttonText: 'til Monday', msgText: 'on Monday' })
    } else {
      snoozeLengths.push({ buttonText: '24h', msgText: 'in 24 hours' })
    }

    const properties = {
      meta: { buttons: [] },
    }

    for (const snooze of snoozeLengths) {
      properties.meta.buttons.push({
        type: 'message',
        text: `Snooze ${snooze.buttonText}`,
        message: `/remind me ${snooze.msgText} ${reminderText}`,
      })
    }

    return properties
  }

  sendReminder(reminder) {
    const properties = this._createSnoozeButtons(reminder)

    this.send(reminder.vgroupid, `You asked me to remind you ${reminder.infinitive ? 'to ' : ''}"${reminder.action}".`, properties)
  }

  deleteReminder(id) {
    console.log(`Removing reminder ${id}`)
    let index = this.reminders.findIndex(r => r.id === id)
    return this.reminders.splice(index, 1)[0]
  }

  getState() {
    return {reminders: this.reminders}
  }

  loadState() {
    // JSON.parse loads dates as strings, convert them to Date objects
    let dateParser = (k, v) => (k == 'date' && typeof v === 'string') ? new Date(v) : v

    try {
      let data = this.brain.get(this.statePath)
      if (data) {
        let state = JSON.parse(data, dateParser)
        this.reminders = state.reminders || []
      }
    } catch (error) {
      console.error('Error loading saved state:', error)
    }
  }

  saveState() {
    this.brain.set(this.statePath, JSON.stringify(this.getState()))
  }
}

module.exports = ReminderBot
