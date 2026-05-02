#  This file is part of Ezra Bible App.
#
#  Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>
#
#  Ezra Bible App is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 2 of the License, or
#  (at your option) any later version.
#
#  Ezra Bible App is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with Ezra Bible App. See the file LICENSE.
#  If not, see <http://www.gnu.org/licenses/>.

Feature: Startup profiling
  In order to measure app startup performance consistently
  I start the app without installing test bible modules

  @startup-profile @no-kjv-needed
  Scenario: Startup completes without installing modules
    Then the startup loading indicator is hidden
    And the KJV is not available as a local module

