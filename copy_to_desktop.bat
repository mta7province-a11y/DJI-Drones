@echo off
echo Copying CarGo project to Desktop...
xcopy /E /I /Y "%~dp0CarGo" "%USERPROFILE%\OneDrive\Desktop\CarGo"
if %ERRORLEVEL% NEQ 0 (
    xcopy /E /I /Y "%~dp0CarGo" "%USERPROFILE%\Desktop\CarGo"
)
echo Done! CarGo is now copied to Desktop\CarGo.
pause
