#  This file is part of Ezra Bible Software.
#
#  Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>
#
#  Ezra Bible Software is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 2 of the License, or
#  (at your option) any later version.
#
#  Ezra Bible Software is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with Ezra Bible Software. See the file LICENSE.
#  If not, see <http://www.gnu.org/licenses/>.

# features/003_module_removal.feature

Feature: Module removal
  If a module is no longer relevant for my bible study
  I can remove that module

  @needs-asv-before @no-kjv-needed
  Scenario: ASV removal
    Given I open the module installation assistant
    And I choose to remove translations
    And I select the ASV module for removal

    When the removal is completed

    Then the ASV is no longer available as a local module