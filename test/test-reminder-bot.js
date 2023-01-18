const expect = require('chai').expect
const sinon = require('sinon')

const FakeWickr = require('./fakes/wickr')
const ReminderBot = require('../lib/reminder-bot')

describe('reminder-bot', function() {
  beforeEach(function() {
    this.bot = new ReminderBot(new FakeWickr(), 'rbot')
  })

  it('instantiates without issue', function() {
    let wickr = new FakeWickr()
    let bot = new ReminderBot(wickr, 'foo')

    expect(bot.reminders).to.be.empty
    expect(bot.timer).to.not.be.null
  })

  it('registers handlers', function() {
    expect(Object.keys(this.bot.handlers)).to.eql(['help', 'remind', 'list', 'delete'])
  })

  it('sends a reminder', function() {
    let reminder = {vgroupid: 'foo', action: 'there\'s a fork in the microwave', infinitive: false}

    sinon.spy(this.bot, 'send')
    this.bot.sendReminder(reminder)
    expect(this.bot.send
      .calledWith('foo', 'You asked me to remind you "there\'s a fork in the microwave".'))
      .to.be.true
  })

  it('sends a reminder in the infinitive form', function() {
    let reminder = {vgroupid: 'foo', action: 'clean your room', infinitive: true}

    sinon.spy(this.bot, 'send')
    this.bot.sendReminder(reminder)
    expect(this.bot.send
      .calledWith('foo', 'You asked me to remind you to "clean your room".'))
      .to.be.true
  })

  describe('#list', function () {
    it('does not list when there are not any reminders', function () {
      expect(this.bot.list({vgroupid: 'bar'})).to.equal('No reminders found')
    })

    it('does not list when there are not any reminders for a vgroup', function () {
      this.bot.reminders = [
        {vgroupid: 'foo'},
        {vgroupid: 'baz'},
        {vgroupid: 'wtf'},
      ]

      expect(this.bot.list({vgroupid: 'bar'})).to.equal('No reminders found')
    })

    it('returns a list of scheduled reminders for a vgroup', function () {
      let now = new Date()
      this.bot.reminders = [
        {vgroupid: 'foo', action: 'stand up', infinitive: true, date: now},
        {vgroupid: 'baz'},
        {vgroupid: 'wtf'},
        {vgroupid: 'foo', action: 'sit down', infinitive: false, date: now},
      ]

      let expected = `Upcoming reminders:\n
\u2460 To "stand up" at ${now}
\u2461 "sit down" at ${now}`

      expect(this.bot.list({vgroupid: 'foo'})).to.equal(expected)
    })

    it('limits output to 20 reminders', function () {
      let now = new Date()
      let fakeReminder = {vgroupid: 'foo', action: 'bar', infinitive: false, date: now}
      this.bot.reminders = Array(30).fill(fakeReminder)

      let expected = `Upcoming reminders:\n
\u2460 "bar" at ${now}
\u2461 "bar" at ${now}
\u2462 "bar" at ${now}
\u2463 "bar" at ${now}
\u2464 "bar" at ${now}
\u2465 "bar" at ${now}
\u2466 "bar" at ${now}
\u2467 "bar" at ${now}
\u2468 "bar" at ${now}
\u2469 "bar" at ${now}
\u246a "bar" at ${now}
\u246b "bar" at ${now}
\u246c "bar" at ${now}
\u246d "bar" at ${now}
\u246e "bar" at ${now}
\u246f "bar" at ${now}
\u2470 "bar" at ${now}
\u2471 "bar" at ${now}
\u2472 "bar" at ${now}
\u2473 "bar" at ${now}`

      expect(this.bot.list({vgroupid: 'foo'})).to.equal(expected)
    })
  })

  describe('#getState', function () {
    it('generates a state object', function () {
      this.bot.reminders = [
        {vgroupid: 'foo'},
        {vgroupid: 'baz'},
        {vgroupid: 'wtf'},
        {vgroupid: 'foo'},
      ]
      let expected = {reminders: this.bot.reminders}
      expect(this.bot.getState()).to.eql(expected)
    })
  })

  describe('#getRemindersForVgroup', function () {
    it('gets reminders for a vgroup', function () {
      this.bot.reminders = [
        {vgroupid: 'foo'},
        {vgroupid: 'baz'},
        {vgroupid: 'wtf'},
        {vgroupid: 'foo'},
      ]
      expect(this.bot.getRemindersForVgroup('foo')).to.eql([{vgroupid: 'foo'}, {vgroupid: 'foo'}])
    })

    it('returns an empty array when there are no reminders for a vgroup', function () {
      this.bot.reminders = [
        {vgroupid: 'foo'},
        {vgroupid: 'baz'},
        {vgroupid: 'wtf'},
      ]
      expect(this.bot.getRemindersForVgroup('bbq')).to.eql([])
    })

    it('returns an empty array when there are no reminders', function () {
      expect(this.bot.getRemindersForVgroup('bbq')).to.eql([])
    })
  })

  describe('#add', function() {
    it('adds a reminder to an empty list', function() {
      let now = new Date()
      this.bot.add({vgroupid: 'foo', id: '123', date: now})
      expect(this.bot.reminders).to.eql([{vgroupid: 'foo', id: '123', date: now}])
    })

    it('adds reminders sorted by date', function() {
      function randomDate() {
        return new Date(Date.now() + (Math.random() * 3153600000))
      }

      for (let i = 0; i < 20; i++) {
        this.bot.add({vgroupid: 'foo', date: randomDate()})
      }

      // use .concat() so reminders isn't sorted in place
      let sorted = this.bot.reminders.concat().sort((a,b) => a.date - b.date)
      expect(this.bot.reminders).to.eql(sorted)
    })
  })

  describe('#deleteReminder', function() {
    it('returns null if the id wasn\'t found', function() {
      expect(this.bot.deleteReminder({id: 'abc'})).to.be.undefined

    })

    it('returns the reminder if it\'s deleted', function() {
      this.bot.reminders = [
        {id: 'foo', foo: 1},
        {id: 'bar', foo: 2},
        {id: 'baz', foo: 42},
        {id: 'zomg', foo: 3},
      ]

      expect(this.bot.deleteReminder('baz')).to.eql({id: 'baz', foo: 42})
    })
  })

  describe('#remove', function() {
    it('removes the correct reminder', function() {
      this.bot.reminders = [
        {vgroupid: 'foo', id: 100},
        {vgroupid: 'bar', id: 101},
        {vgroupid: 'baz', id: 102},
        {vgroupid: 'foo', id: 103},
        {vgroupid: 'bar', id: 104},
        {vgroupid: 'baz', id: 125},
        {vgroupid: 'foo', id: 126}, // this one
        {vgroupid: 'bar', id: 127},
        {vgroupid: 'baz', id: 128},
        {vgroupid: 'foo', id: 109},
      ]

      expect(this.bot.remove('foo', 2)).to.eql({vgroupid: 'foo', id: 126})
    })
  })

  describe('#getRemindersToNotify', function() {
    it('returns an empty array when there are no reminders', function() {
      expect(this.bot.getRemindersToNotify()).to.eql([])
    })

    it('returns all reminders when they are all in the past', function() {
      let now = Date.now()

      let past = [
        {date: new Date(now - 5000)},
        {date: new Date(now - 4000)},
        {date: new Date(now - 3000)},
        {date: new Date(now - 2000)},
      ]

      this.bot.reminders = past.concat()

      expect(this.bot.getRemindersToNotify()).to.eql(past)
    })

    it('returns all reminders which have a date <= now', function() {
      let now = Date.now()

      let past = [
        {date: new Date(now - 5000)},
        {date: new Date(now - 4000)},
        {date: new Date(now - 3000)},
        {date: new Date(now - 2000)},
      ]

      let future = [
        {date: new Date(now + 2000)},
        {date: new Date(now + 3000)},
        {date: new Date(now + 4000)},
        {date: new Date(now + 5000)},
      ]

      this.bot.reminders = past.concat(future)

      expect(this.bot.getRemindersToNotify()).to.eql(past)
    })
  })
})
