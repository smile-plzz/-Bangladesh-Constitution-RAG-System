@echo off

FOR /F "tokens=*" %%g IN ('node read-config.js') do (SET CONFIG=%%g)

SET ARGS=%CONFIG%

SET URL=%ARGS% 
SET OUTPUT_FILE=%ARGS% 

REM This is a bit of a hack to split the string in batch
for /f "tokens=1,2" %%a in ("%ARGS%") do (
    SET URL=%%a
    SET OUTPUT_FILE=%%b
)

node src/scraper.js --url=%URL% --output=%OUTPUT_FILE%
