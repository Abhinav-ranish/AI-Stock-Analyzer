@echo off
REM IDK IF THIS WORKS? I DONT HAVE A WINDOWS MACHINE TO TEST IT ON

echo ===========================
echo Checking and Installing Prerequisites...
echo ===========================

REM ----- Check for Windows Package Manager -----
@powershell -Command "iwr -useb https://aka.ms/install-powershell.ps1 | iex"

REM ----- Check for Python -----
winget install -e --id Python.Python.3


winget install -e --id OpenJS.NodeJS.LTS

REM ----- Check for Git -----
winget install -e --id Git.Git


REM ----- Check for Ollama -----
winget install -e --id Ollama.Ollama

echo ===========================
echo Cloning Repository...
echo ===========================

git clone https://github.com/Abhinav-ranish/AI-Stock-Analyzer.git stockbot
cd stockbot

echo.
echo ===========================
echo Creating Python Virtual Environment...
echo ===========================
python -m venv env

echo.
echo ===========================
echo Activating Virtual Environment...
echo ===========================
call env\Scripts\activate

echo.
echo ===========================
echo Installing Python Dependencies...
echo ===========================
pip install -r requirements.txt

echo.
echo ===========================
echo Starting Backend Server in Background...
echo ===========================
REM Modify "server.py" if your backend entry point has a different name.
start "" python server.py

echo.
echo ===========================
echo Installing Frontend Dependencies...
echo ===========================
REM Assuming your frontend folder is named "stockbotfrontend"
cd stockbotfrontend
npm install

echo.
echo ===========================
echo Starting Frontend...
echo ===========================
npm run

echo.
echo Installation complete.
pause
