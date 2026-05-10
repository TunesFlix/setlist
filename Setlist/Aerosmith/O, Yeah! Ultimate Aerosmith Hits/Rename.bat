@echo off
setlocal enabledelayedexpansion

REM Loop through all files in the current directory
for %%f in (*[*]*) do (
    set "oldname=%%f"
    set "newname=!oldname:[=(!"
    set "newname=!newname:]=)!"
    echo Renaming "%%f" to "!newname!"
    ren "%%f" "!newname!"
)

echo Done!
pause
