import { endTouch } from '../components/endTouch';
import type { GestureResponderEvent } from 'react-native';

const lift = () => {
  const ev = { preventDefault: jest.fn() };
  return { ev, e: ev as unknown as GestureResponderEvent };
};

describe('a finger lifting off the paper or the mic', () => {
  test("in a phone's browser the touch is ended, so the browser's own click cannot land on the sheet it opened", () => {
    const { ev, e } = lift();
    endTouch(e, 'web');
    expect(ev.preventDefault).toHaveBeenCalledTimes(1);
  });
  test('in the phone app, which sends no such click, the touch is left alone', () => {
    for (const os of ['android', 'ios']) {
      const { ev, e } = lift();
      endTouch(e, os);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    }
  });
  test('an event with nothing to end, or none at all, is no error', () => {
    expect(() => endTouch({} as GestureResponderEvent, 'web')).not.toThrow();
    expect(() => endTouch(undefined, 'web')).not.toThrow();
  });
});
