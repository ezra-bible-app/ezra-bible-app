/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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


/**
 * The VerseStatisticsChart component renders a chart with verse count statistics per bible book. This is used by the ModuleSearch component.
 * 
 * @category Component
 */
class VerseStatisticsChart {
  constructor() {
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
    var currentVerseListFrame = app_controller.getCurrentVerseListFrame(tabIndex);
    return currentVerseListFrame.find('.verse-statistics-chart');
  }

  resetChart(tabIndex=undefined) {
    var currentVerseListFrame = app_controller.getCurrentVerseListFrame(tabIndex);
    var container = currentVerseListFrame.find('.verse-statistics-chart-container');

    container.hide();
    container.empty();

    var canvasElement = "<canvas class='verse-statistics-chart'></canvas>";
    container.append(canvasElement);
  }

  async repaintChart(tabIndex=undefined) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    if (!currentTab.isVerseList()) {
      return;
    }

    var currentTextType = currentTab.getTextType();
    var bibleBookStats = null;

    if (currentTextType == 'search_results') {
      var currentTab = app_controller.tab_controller.getTab(tabIndex);
      var currentSearchResults = currentTab.getSearchResults();
      bibleBookStats = app_controller.module_search_controller.getBibleBookStatsFromSearchResults(currentSearchResults);
    } else {
      bibleBookStats = app_controller.getBibleBookStatsFromVerseList(tabIndex);
    }

    var numberOfBibleBookStatsEntries = Object.keys(bibleBookStats).length;

    if (numberOfBibleBookStatsEntries > 0) {
      this.resetChart(tabIndex);
      await this.updateChart(tabIndex, bibleBookStats);
    }
  }

  async repaintAllCharts() {
    var tabCount = app_controller.tab_controller.getTabCount();

    for (var i = 0; i < tabCount; i++) {
      var currentTab = app_controller.tab_controller.getTab(i);

      if (currentTab.isVerseList()) {
        await this.repaintChart(i);
      }
    }
  }

  async updateChart(tabIndex=undefined, bibleBookStats) {
    require('chart.js/dist/Chart.bundle.min.js');

    var numberOfBooks = Object.keys(bibleBookStats).length;
    if (numberOfBooks < 2) {
      return;
    }
    
    var currentTranslation = app_controller.tab_controller.getTab(tabIndex).getBibleTranslationId();
    var bookList = await ipcNsi.getBookList(currentTranslation);

    const [labels, values] = await ipcGeneral.getSearchStatisticChartData(currentTranslation, bookList, bibleBookStats);

    var data = {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: this.chartColors.blue,
        borderWidth: 1
      }]
    };

    var chartElement = this.getVerseStatisticsChart(tabIndex);
    var useNightMode = app_controller.optionsMenu._nightModeOption.isChecked();
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