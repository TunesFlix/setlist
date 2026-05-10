@echo off
setlocal enabledelayedexpansion

set "root=%~dp0"
set "json=%root%Setlist.json"

for /d %%F in ("%root%\*") do (
    set "name=%%~nxF"
    rem trim leading spaces
    for /f "tokens=* delims= " %%X in ("!name!") do set "clean=%%X"
    if not "!name!"=="!clean!" ren "%%F" "!clean!"

    rem process subfolders (albums)
    for /d %%A in ("%%F\*") do (
        set "sub=%%~nxA"
        for /f "tokens=* delims= " %%Y in ("!sub!") do set "subclean=%%Y"
        if not "!sub!"=="!subclean!" ren "%%A" "!subclean!"
    )
)

(
echo {
echo   "bands": [
) > "%json%"

set firstBand=true

for /d %%B in ("%root%\*") do (
    set "bandCover=Setlist/%%~nxB/%%~nxB.jpg"

    if "!firstBand!"=="true" (
        set firstBand=false
    ) else (
        >> "%json%" echo ,
    )

    (
    echo     {
    echo       "name": "%%~nxB",
    echo       "genre": "unknown",
    echo       "cover": "Setlist/%%~nxB/%%~nxB.jpg",
    echo       "albums": [
    ) >> "%json%"

    set firstAlbum=true

    :: Turn off delayed expansion so ! in album names is preserved
    setlocal disableDelayedExpansion
    for /d %%A in ("%%B\*") do (
        (
          for %%T in ("%%A\*.mp3") do echo %%~nxT
          for %%T in ("%%A\*.mp4") do echo %%~nxT
          for %%T in ("%%A\*.flac") do echo %%~nxT
        ) > "%%A\setlist.txt"

        if defined firstAlbum (
            set firstAlbum=
        ) else (
            >> "%json%" echo ,
        )

        >> "%json%" echo         {
        >> "%json%" echo           "title": "%%~nxA",
        >> "%json%" echo           "cover": "Setlist/%%~nxB/%%~nxA/%%~nxA.jpg",
        >> "%json%" echo           "path": "Setlist/%%~nxB/%%~nxA/"
        >> "%json%" echo         }
    )
    endlocal

    (
    echo       ]
    echo     }
    ) >> "%json%"
)

(
echo   ]
echo }
) >> "%json%"