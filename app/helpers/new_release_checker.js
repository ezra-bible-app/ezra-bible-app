/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

class NewReleaseChecker {
  constructor(infoBoxId) {
    this.infoBoxId = infoBoxId;
    this.latestRelease = null;
    this.initNewReleaseBox();
  }

  getInfoBox() {
    return $('#' + this.infoBoxId);
  }

  initNewReleaseBox() {
    this.getInfoBox().dialog({
      width: 350,
      height: 250,
      autoOpen: false,
      modal: true,
      title: i18n.t("general.new-release-available-title"),
      buttons: {
        Ok: function() {
          $(this).dialog("close");
        }
      }
    });
  };

  check() {
    this.getLatestReleaseFromGitHub().then(latestRelease => {
      this.latestRelease = latestRelease;

      if (this.isNewReleaseAvailable() && this.isInfoWanted()) {
        this.showNewRelease();
      }
    }).catch((error) => {
      console.error("Could not get latest release info from GitHub. Offline?");
    });
  }

  showNewRelease() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    var verse_list_position = currentVerseList.offset();
    var infoBox = this.getInfoBox();

    infoBox.dialog({
      position: [verse_list_position.left + 150, verse_list_position.top + 30]
    });

    infoBox.dialog("open");
    infoBox.append('<p>' + i18n.t('general.new-release-available-body') + '</p>');
    infoBox.append('<p>' + i18n.t('general.latest-version') + ': <b>' + this.latestRelease.tag + '</b></p>');
    var latestReleaseLink = "<a class='external' href='" + this.latestRelease.url + "'>" + i18n.t('general.release-notes-download') + "</a>";
    infoBox.append('<p>' + latestReleaseLink + '</p><br/>');

    infoBox.append("<input id='no-new-release-info' type='checkbox'></input>");
    infoBox.append("<label style='margin-left: 0.5em;' for='no-new-release-info'>" + i18n.t('general.no-repeated-info') + "</label>");

    infoBox.find('#no-new-release-info').bind('click', () => {
      if ($('#no-new-release-info').prop("checked")) {
        bible_browser_controller.settings.set('noNewReleaseInfo', this.latestRelease.tag);
      } else {
        bible_browser_controller.settings.delete('noNewReleaseInfo');
      }
    });
  }

  isNewReleaseAvailable() {
    var currentVersion = app.getVersion();
    var latestVersion = this.latestRelease.tag;

    return this.compareVersion(latestVersion, currentVersion) > 0;
  }

  isInfoWanted() {
    var latestVersion = this.latestRelease.tag;

    if (bible_browser_controller.settings.has('noNewReleaseInfo')) {
      var noNewReleaseInfo = bible_browser_controller.settings.get('noNewReleaseInfo');
      return noNewReleaseInfo != latestVersion;
    } else {
      return true;
    }
  }

  getLatestRelease() {
    return this.latestRelease;
  }

  // from https://helloacm.com/the-javascript-function-to-compare-version-number-strings/
  compareVersion(v1, v2) {
    if (typeof v1 !== 'string') return false;
    if (typeof v2 !== 'string') return false;

    v1 = v1.split('.');
    v2 = v2.split('.');

    const k = Math.min(v1.length, v2.length);

    for (let i = 0; i < k; ++ i) {
        v1[i] = parseInt(v1[i], 10);
        v2[i] = parseInt(v2[i], 10);
        if (v1[i] > v2[i]) return 1;
        if (v1[i] < v2[i]) return -1;        
    }

    return v1.length == v2.length ? 0: (v1.length < v2.length ? -1 : 1);
  }

  getLatestReleaseFromGitHub() {
    return new Promise((resolve, reject) => {
      this.requestReleaseDataFromGitHub((data) => {
        var latestRelease = {
          "name": data["name"],
          "tag": data["tag_name"],
          "publishedAt": data["published_at"],
          "url": data["html_url"]
        };

        resolve(latestRelease);
      }, () => {
        reject();
      });
    });
  }

  requestReleaseDataFromGitHub(successCallback, errorCallback) {
    var githubUrl = "https://api.github.com/repos/tobias-klein/ezra-project/releases/latest";
    return $.getJSON(githubUrl).done(successCallback).error(errorCallback);
  }
}

module.exports = NewReleaseChecker;