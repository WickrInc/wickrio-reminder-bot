const expect = require('chai').expect

const Reminder = require('../lib/reminder')

describe('reminder', function() {
  it('sets the vgroupid', () => {
    let reminder = new Reminder({vgroupid: 'foo'}, 'to get up in ten minutes')
    expect(reminder.vgroupid).to.equal('foo')
  })

  it('parses various reminders and actions correctly', function() {
    let tests = [
      {
        input: 'me to go for a walk in an hour',
        expected: {
          action: 'go for a walk',
          dateText: 'in an hour',
          infinitive: true,
        },
      },
      {
        input: 'to stand up 3 times tomorrow',
        expected: {
          action: 'stand up 3 times',
          dateText: 'tomorrow',
          infinitive: true,
        },
      },
      {
        input: 'clothes in the dryer in 666 seconds',
        expected: {
          action: 'clothes in the dryer',
          dateText: 'in 666 seconds',
          infinitive: false,
        },
      },
      {
        input: 'check into flight tomorrow at 7am',
        expected: {
          action: 'check into flight',
          dateText: 'tomorrow at 7am',
          infinitive: false,
        },
      },
      {
        input: 'sprinkler in 1 hour',
        expected: {
          action: 'sprinkler',
          dateText: 'in 1 hour',
          infinitive: false,
        },
      },
      {
        input: 'mess with parser in 123124 seconds',
        expected: {
          action: 'mess with parser',
          dateText: 'in 123124 seconds',
          infinitive: false,
        },
      },
      {
        input: 'me in an hour to go for a walk',
        expected: {
          action: 'go for a walk',
          dateText: 'in an hour',
          infinitive: true,
        },
      },
      {
        input: 'in an hour to go for a walk',
        expected: {
          action: 'go for a walk',
          dateText: 'in an hour',
          infinitive: true,
        },
      },
      {
        input: 'me to go for a long walk in an hour please',
        expected: {
          action: 'go for a long walk',
          dateText: 'in an hour',
          infinitive: true,
        },
      },
    ]

    // TODO(dw): Check if result.date is above/below a certain range
    tests.forEach(t => {
      let reminder = new Reminder({vgroupid: 'foo'}, t.input)

      expect(reminder.action).to.equal(t.expected.action)
      expect(reminder.dateText).to.equal(t.expected.dateText)
      expect(reminder.infinitive).to.equal(t.expected.infinitive)
      expect(reminder.date).to.be.above(new Date())
    })
  })

  it('throws an exception when it cannot parse a reminder', () => {
    // TODO(dw): more
    let fn = () => new Reminder({vgroupid: 'foo'}, '?')
    expect(fn).to.throw(/Unable to parse date from reminder/)

    //fn = () => new Reminder({vgroupid: "foo"}, "in eight minutes");
    //expect(fn).to.throw(/Unable to parse reminder/);
  })

  it('throws an error when a reminder is in the past', () => {
    let fn = () => new Reminder({vgroupid: 'foo'}, 'me to stand up five minutes ago')
    expect(fn).to.throw(/Scheduled time is in the past/)
  })
})
