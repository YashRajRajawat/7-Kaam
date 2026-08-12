@echo off
:: ---------------------------------------------------------------------------
::  Moved. The launcher now lives at the repository root, because it starts
::  services that live outside 7kaam\ too (the AI Trust Engine in
::  Video_processing\, and the scraper used by the dashboard).
::
::  This forwarder is kept so the old path still works.
:: ---------------------------------------------------------------------------
echo.
echo  The launcher has moved to the repository root.
echo  Starting: %~dp0..\START_7KAAM.bat
echo.
call "%~dp0..\START_7KAAM.bat" %*
