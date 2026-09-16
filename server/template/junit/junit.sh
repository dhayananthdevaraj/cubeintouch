#!/bin/bash
rm -rf /home/coder/project/workspace/springapp/target/surefire-reports;
src_directory="/home/coder/project/workspace/springapp/src"
 
if [ -d "$src_directory" ]; then
    cp -r /home/coder/project/workspace/junit/test "$src_directory"
    cd /home/coder/project/workspace/springapp;
    mvn -q test
else
 
    echo "The 'src' folder does not exist in"
fi
 
cp -r /home/coder/project/workspace/junit/Report /home/coder/project/workspace;
cd /home/coder/project/workspace/Report;
source /usr/local/nvm/nvm.sh
nvm use 14
npm i
node customReport.js
rm -rf /home/coder/project/workspace/Report;