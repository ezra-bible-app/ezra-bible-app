const eventController = require('../event_controller.js');

const  TEST_EVENT = 'on-test-event';


describe('eventController', ()=> {
  
  var subscription;

  var simpleMock = null;

  beforeEach(() => {
    simpleMock = jest.fn();
    subscription = eventController.subscribe(TEST_EVENT, simpleMock);
  });

  afterEach(() => {
    subscription.remove();
    simpleMock = null;
  });
  
  it('calls the callback after publishing', () => {
    eventController.publish(TEST_EVENT);

    expect(simpleMock.mock.calls.length).toBe(1);

    eventController.publish(TEST_EVENT);
    eventController.publish(TEST_EVENT, 'some payload');

    expect(simpleMock.mock.calls.length).toBe(3);
    expect(simpleMock.mock.calls[2][0]).toBe('some payload');
  });

  it('doesn\'t call the callback if it\'s not subscribed to the event', () => {
    eventController.publish('some-other-event');

    expect(simpleMock.mock.calls.length).toBe(0);
  });

  it('calls async callback', async () => {
    const asyncSubscription = eventController.subscribe('test-async', async () => {
      return new Promise(resolve => {
        setTimeout(()=> {
          simpleMock();
          resolve();
        }, 500);
      });
    });

    await eventController.publishAsync('test-async');

    expect(simpleMock.mock.calls.length).toBe(1);

    asyncSubscription.remove();
  });

  it('unsubscribes all callbacks', () => {
    eventController.unsubscribeAll(TEST_EVENT);
    eventController.publish(TEST_EVENT);

    expect(simpleMock.mock.calls.length).toBe(0);
  });

  it('unsubscribes all callbacks with RegExp', () => {
    eventController.unsubscribeAll(/on-test.*/i);
    eventController.publish(TEST_EVENT);

    expect(simpleMock.mock.calls.length).toBe(0);
  });
});