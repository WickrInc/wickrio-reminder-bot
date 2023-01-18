const chrono = require('chrono-node')

// Default to Eastern Time
// This isn't ideal but I haven't quite figured out how to dynamically set the
// timezone in chrono w/o breaking relative time parsing.
process.env.TZ = 'America/New_York'

class Reminder {
  constructor(msg, text) {
    this.msg = msg
    this.vgroupid = msg.vgroupid
    this._parse(text)
  }

  _parse(text) {
    let dateParse = chrono.parse(text, undefined, { forwardDate: true })[0]
    if (!dateParse) {
      throw new Error('Unable to parse date from reminder')
    }

    this.date = dateParse.start.date()

    if (this.date < Date.now()) {
      throw new Error('Scheduled time is in the past')
    }

    this.dateText = dateParse.text

    let {action, infinitive} = this._findAction(text, dateParse)
    this.action = action
    this.infinitive = infinitive
  }

  // finds the action portion of a reminder, e.g. "go for a walk in one hour" => "go for a walk"
  // accepts the full text of the reminder, and the parsed date object from chrono
  _findAction(text, dateParse) {
    let actionText = text,
      index = dateParse.index,
      endOfTime = index + dateParse.text.length

    // if the index position is > the length at the end of the string,
    // assume that the "action" is at the start of the text
    if (index > (text.length - endOfTime)) {
      actionText = text.substring(0, index-1)
    } else {
      actionText = text.substring(endOfTime+1)
    }

    // parse out "me" and "to" from beginning of action, and "in" from the end
    // if "to" exists, the reminder is in the infinitive form
    let match = actionText.match(/(?:me\s)?(to\s)?(.*)(?:\sin)$/)
    if (match === null) {
      // this isn't great. i'd prefer to do a non-capturing match of the `in` at the end
      // of the `actionText` in one regex, but the `.*` before it is greedy
      // so we're going to cheat and just run two regexes to check for the `in`
      match = actionText.match(/(?:me\s)?(to\s)?(.*)/)
      if (match === null) {
        throw new Error('Unable to parse reminder')
      }
    }

    return {infinitive: (match[1] !== undefined), action: match[2]}
  }
}

module.exports = Reminder
