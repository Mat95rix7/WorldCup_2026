@echo off
set /p commitMessage="Entrez votre message de commit : "

git add *
git commit -m "%commitMessage%"
git push -u origin master