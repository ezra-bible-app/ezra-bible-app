/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

window.getChromiumVersion = function() {
  var userAgent = navigator.userAgent;
  var splittedUserAgent = userAgent.split(' ');
  var chromiumVersion = null;

  for (var i = 0; i < splittedUserAgent.length; i++) {
    if (splittedUserAgent[i].indexOf('Chrome/') != -1) {
      chromiumVersion = splittedUserAgent[i].replace('Chrome/', '');
      break;
    }
  }

  return chromiumVersion;
}

window.getChromiumMajorVersion = function() {
  var chromiumVersion = getChromiumVersion();
  var splittedVersion = chromiumVersion.split('.');
  chromiumVersion = parseInt(splittedVersion[0]);
  return chromiumVersion;
}

window.supportsEcmaScript2017 = function() {
  var chromiumVersion = getChromiumMajorVersion();

  if (chromiumVersion == null) {
    return undefined;
  }

  var minimumVersionSupportingES2017 = 55; 

  return chromiumVersion >= minimumVersionSupportingES2017;
}

window.isAndroidWebView = function() {
  return navigator.userAgent.indexOf('; wv') != -1;
}

window.getOutdatedWebViewMessage = function() {
  var chromiumVersion = getChromiumMajorVersion();

  var generalInfoBoxMessage = "Your Android WebView component is too old (" + chromiumVersion + ")" +
                                " and does not support Ezra Project.<br><br>" +
                                "To run Ezra Project you need a newer version" +
                                " of the <b>Android System WebView</b> component, at least version 55.<br><br>" +
                                "You can install a newer version of that app from the Play Store!";

  return generalInfoBoxMessage;
}

window.showOutdatedWebviewMessage = function() {
  var title = 'Android WebView not compatible!';
  var message = getOutdatedWebViewMessage();

  showMessage(title, message);
}

window.showIncompatibleWebviewMessage = function() {
  var title = "Android WebView not compatible!";
  var message = "The exact Android WebView version is not available for some reason. Compatibility is unclear.<br>" +
                "Try to install a newer version of the <b>Android System WebView</b> component from the Play Store.";

  showMessage(title, message);
}

window.showMessage = function(title, message) {
  var loadingIndicator = $('#startup-loading-indicator');
  loadingIndicator.hide();
  $('#main-content').show();

  var generalInfoBoxBox = $('#general-info-box');
  var generalInfoBoxBoxContent = $('#general-info-box-content');

  generalInfoBoxBoxContent.html(message);

  generalInfoBoxBox.dialog({
    title: title,
    width: 400,
    autoOpen: true,
    dialogClass: 'ezra-dialog dialog-without-close-button android-dialog-large-fontsize',
    modal: true,
    resizable: false
  });
}
