/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */


/* inspired by https://github.com/john-doherty/long-press-event */

const LONG_PRESS_DELAY = 500;
const MAX_TOUCH_SHIFT = 10;

const hasPointerEvents = typeof window.PointerEvent == 'function';
const startEvent = hasPointerEvents ? 'pointerdown' : 'touchstart';
const endEvents = hasPointerEvents ? ['pointerup', 'pointercancel'] : ['touchend', 'touchcancel'];
const moveEvent = hasPointerEvents ? 'pointermove' : 'touchmove';
const subscriptions = new WeakMap();
const activeGestures = new Set();

function clearPendingLongPresses() {
  activeGestures.forEach((gesture) => gesture());
}

window.addEventListener('wheel', clearPendingLongPresses);
window.addEventListener('scroll', clearPendingLongPresses);

/**
 * Subscribes to long-press gestures on an element.
 * @param {HTMLElement} element - element to listen on
 * @param {Function} callback - called with the gesture target and start event
 * @param {Function} shouldStart - determines whether a gesture can start
 * @returns {Function} function that removes the subscription
 */
module.exports.subscribe = function(element, callback, shouldStart=() => true) {
  const existingUnsubscribe = subscriptions.get(element);
  if (existingUnsubscribe) {
    existingUnsubscribe();
  }

  let timer = null;
  let startX = 0;
  let startY = 0;
  let startTarget = null;
  let pointerId = null;
  let longPressTriggered = false;
  let suppressCompatibilityEvents = false;
  let suppressionTimer = null;

  function clearTimer() {
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
    activeGestures.delete(clearTimer);
  }

  function getCoordinates(event) {
    if (event.changedTouches && event.changedTouches.length > 0) {
      return event.changedTouches[0];
    }

    if (event.touches && event.touches.length > 0) {
      return event.touches[0];
    }

    return event;
  }

  function handleStart(event) {
    if (hasPointerEvents && event.pointerType === 'mouse') {
      return;
    }

    if (!shouldStart(event)) {
      return;
    }

    clearTimer();
    if (suppressionTimer != null) {
      window.clearTimeout(suppressionTimer);
      suppressionTimer = null;
    }

    const coordinates = getCoordinates(event);
    startX = coordinates.clientX;
    startY = coordinates.clientY;
    startTarget = event.target;
    pointerId = event.pointerId;
    longPressTriggered = false;
    suppressCompatibilityEvents = false;
    activeGestures.add(clearTimer);

    if (hasPointerEvents && pointerId != null && typeof element.setPointerCapture == 'function') {
      element.setPointerCapture(pointerId);
    }

    timer = window.setTimeout(() => {
      timer = null;
      activeGestures.delete(clearTimer);
      longPressTriggered = true;
      suppressCompatibilityEvents = true;
      callback(startTarget, event);
    }, LONG_PRESS_DELAY);
  }

  /**
   * If the finger moves MAX_TOUCH_SHIFT pixels during long-press, cancel the timer.
   * @param {PointerEvent|TouchEvent} event - browser event object
   */
  function handleMove(event) {
    if (timer == null || (pointerId != null && event.pointerId != null && event.pointerId !== pointerId)) {
      return;
    }

    const coordinates = getCoordinates(event);
    if (coordinates.clientX == null || coordinates.clientY == null) {
      clearTimer();
      return;
    }

    const diffX = Math.abs(startX - coordinates.clientX);
    const diffY = Math.abs(startY - coordinates.clientY);

    if (diffX >= MAX_TOUCH_SHIFT || diffY >= MAX_TOUCH_SHIFT) {
      clearTimer();
    }
  }

  function handleEnd(event) {
    if (pointerId != null && event.pointerId != null && event.pointerId !== pointerId) {
      return;
    }

    clearTimer();
    pointerId = null;

    if (longPressTriggered) {
      suppressionTimer = window.setTimeout(() => {
        suppressCompatibilityEvents = false;
        longPressTriggered = false;
        suppressionTimer = null;
      }, 800);
    }
  }

  function suppressCompatibilityEvent(event) {
    if (!suppressCompatibilityEvents) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.type == 'click') {
      suppressCompatibilityEvents = false;
      longPressTriggered = false;
      if (suppressionTimer != null) {
        window.clearTimeout(suppressionTimer);
        suppressionTimer = null;
      }
    }
  }

  function unsubscribe() {
    clearTimer();
    if (suppressionTimer != null) {
      window.clearTimeout(suppressionTimer);
      suppressionTimer = null;
    }

    element.removeEventListener(startEvent, handleStart);
    element.removeEventListener(moveEvent, handleMove);
    endEvents.forEach((eventName) => {
      element.removeEventListener(eventName, handleEnd);
    });
    element.removeEventListener('mousedown', suppressCompatibilityEvent, true);
    element.removeEventListener('mouseup', suppressCompatibilityEvent, true);
    element.removeEventListener('click', suppressCompatibilityEvent, true);
    activeGestures.delete(clearTimer);

    if (subscriptions.get(element) === unsubscribe) {
      subscriptions.delete(element);
    }
  }

  element.addEventListener(startEvent, handleStart);
  element.addEventListener(moveEvent, handleMove);
  endEvents.forEach((eventName) => {
    element.addEventListener(eventName, handleEnd);
  });
  element.addEventListener('mousedown', suppressCompatibilityEvent, true);
  element.addEventListener('mouseup', suppressCompatibilityEvent, true);
  element.addEventListener('click', suppressCompatibilityEvent, true);

  subscriptions.set(element, unsubscribe);
  return unsubscribe;
};
