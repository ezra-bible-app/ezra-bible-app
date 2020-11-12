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


class VerseStatisticsChart {
  constructor() {
    require('chart.js/dist/Chart.bundle.min.js');

    this.chartColors = {
      red: 'rgb(255, 99, 132)',
      orange: 'rgb(255, 159, 64)',
      yellow: 'rgb(255, 205, 86)',
      green: 'rgb(75, 192, 192)',
      blue: 'rgb(54, 162, 235)',
      purple: 'rgb(153, 102, 255)',
      grey: 'rgb(201, 203, 207)'
    };
  }

  getVerseStatisticsChart(tabIndex=undefined) {
    var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame(tabIndex);
    return currentVerseListFrame.find('.verse-statistics-chart');
  }

  resetChart(tabIndex=undefined) {
    var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame(tabIndex);
    var container = currentVerseListFrame.find('.verse-statistics-chart-container');

    container.hide();
    container.empty();

    var canvasElement = "<canvas class='verse-statistics-chart'></canvas>";
    container.append(canvasElement);
  }

  getLabelsAndValuesFromStats(bookList, bibleBookStats) {
    var labels = [];
    var values = [];
    var ntOnly = true;
    var otOnly = true;

    for (var book in bibleBookStats) {
      if (!models.BibleBook.isNtBook(book)) {
        ntOnly = false;
      }

      if (!models.BibleBook.isOtBook(book)) {
        otOnly = false;
      }
    }
    
    bookList.forEach((book) => {
      var includeCurrentBook = false;

      if (ntOnly && models.BibleBook.isNtBook(book)) {
        includeCurrentBook = true;
      } else if (otOnly && models.BibleBook.isOtBook(book)) {
        includeCurrentBook = true;
      } else if (!otOnly && !ntOnly) {
        includeCurrentBook = true;
      }

      if (includeCurrentBook) {
        var translatedBook = i18nHelper.getBookAbbreviation(book);
        labels.push(translatedBook);

        var value = 0;
        if (book in bibleBookStats) {
          value = bibleBookStats[book];
        }

        values.push(value);
      }
    });

    return [labels, values];
  }

  updateChart(tabIndex=undefined, bibleBookStats) {
    var numberOfBooks = Object.keys(bibleBookStats).length;
    if (numberOfBooks < 2) {
      return;
    }
    
    var currentTranslation = bible_browser_controller.tab_controller.getTab(tabIndex)?.getBibleTranslationId();
    var bookList = nsi.getBookList(currentTranslation);

    const [labels, values] = this.getLabelsAndValuesFromStats(bookList, bibleBookStats);

    var data = {
      labels: labels,
      datasets: [{
          data: values,
          backgroundColor: this.chartColors.blue,
          borderWidth: 1
      }]
    };

    var chartElement = this.getVerseStatisticsChart(tabIndex);
    var useNightMode = bible_browser_controller.optionsMenu._nightModeOption.isChecked();
    var labelFontColor = useNightMode ? "white" : "black";
    
    new Chart(chartElement, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          display: false
        },
        scaleShowValues: true,
        scales: {
          xAxes: [{
            ticks: {
              autoSkip: false,
              fontSize: 10,
              fontColor: labelFontColor,
            },
            // grid line settings
            gridLines: {
              drawOnChartArea: false, // only want the grid lines for one axis to show up
            },
          }],
          yAxes: [{
            gridLines: {
              color: this.chartColors.grey,
              zeroLineColor: this.chartColors.grey
            },
            ticks: {
              fontColor: labelFontColor,
              precision: 0
            }
          }]
        }
      }
    });

    $(chartElement).parent().show();
  }
}

module.exports = VerseStatisticsChart;