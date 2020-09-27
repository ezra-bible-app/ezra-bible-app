<#
This PowerShell script is used as a work-around to address a bug in NuGet that consequently
causes a packing problem with electron-installer-windows.

see https://github.com/electron-userland/electron-installer-windows/issues/327
see https://github.com/NuGet/Home/issues/7001
#>

Get-ChildItem -path "release\\" -rec -file *.* |
    Where-Object {$_.LastWriteTime -lt (Get-Date).AddYears(-20)} |
        ForEach-Object  {
            try { 
                $_.LastWriteTime = '01/01/2020 00:00:00'
            } catch {}
        }