#  This file is part of Ezra Project.
#
#  Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>
#
#  Ezra Project is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 2 of the License, or
#  (at your option) any later version.
#
#  Ezra Project is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with Ezra Project. See the file LICENSE.
#  If not, see <http://www.gnu.org/licenses/>.

# features/003_module_removal.feature

Feature: Module removal
  If a module is no longer relevant for my bible study
  I can remove that module

  Scenario: KJV removal
    Given the KJV is the only translation installed
    And I open the module installation assistant
    And I choose to remove translations
    And I select the KJV module for removal

    When the removal is completed

    Then the KJV is no longer available as a local module
    And the application has disabled buttons, because no translations are installed at this point