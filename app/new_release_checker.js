/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
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
      width: 400,
      height: 200,
      autoOpen: false,
      title: i18n.t("general.new-release-available-title")
    });
  };

  async check() {
    this.latestRelease = await this.getLatestReleaseFromGitHub();

    if (this.isNewReleaseAvailable()) {
      this.showNewRelease();
    }
  }

  showNewRelease() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    var verse_list_position = currentVerseList.offset();
    var infoBox = this.getInfoBox();

    infoBox.dialog({
      position: [verse_list_position.left + 50, verse_list_position.top + 30]
    });

    infoBox.dialog("open");
    infoBox.append('<p>' + i18n.t('general.new-release-available-body') + '</p>');
    infoBox.append('<p>' + i18n.t('general.latest-version') + ': ' + this.latestRelease.tag + '</p>');

    var latestReleaseLink = "<a class='external' href='" + this.latestRelease.url + "'>" + i18n.t('general.release-notes-download') + "</a>";
    infoBox.append('<p>' + latestReleaseLink + '</p>');
  }

  isNewReleaseAvailable() {
    var currentVersion = app.getVersion();
    var latestVersion = this.latestRelease.tag;

    return this.compareVersion(latestVersion, currentVersion) > 0;
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

  async getLatestReleaseFromGitHub() {
    var latestRelease = await this.getLatestReleaseFromGitHubPromise();
    return latestRelease;
  }

  getLatestReleaseFromGitHubPromise() {
    return new Promise(resolve => {
      this.requestReleaseDataFromGitHub((data) => {
        var latestRelease = {
          "name": data["name"],
          "tag": data["tag_name"],
          "publishedAt": data["published_at"],
          "url": data["html_url"]
        };

        resolve(latestRelease);
      });
    });
  }

  requestReleaseDataFromGitHub(callback) {
    var githubUrl = "https://api.github.com/repos/tobias-klein/ezra-project/releases/latest";
    $.getJSON(githubUrl, callback);
  }
}

module.exports = NewReleaseChecker;