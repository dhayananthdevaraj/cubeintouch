const fs = require('fs').promises;
const xml2js = require('xml2js');
const path = require('path');

const directoryPath = '/home/coder/project/workspace/springapp/target/surefire-reports';
const parser = new xml2js.Parser();
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let syntaxErrorOccurred = false;
const color = {
    reset: "\x1b[0m",
    blue: "\x1b[34m",
    green: "\x1b[32m",
    red: "\x1b[31m"
};

fs.access(directoryPath, 0)
    .then(() => {
        return fs.readdir(directoryPath);
    })
    .then(files => {
        const promises = files.map(file => {
            if (path.extname(file) === '.xml') {
                const filePath = path.join(directoryPath, file);
                    return fs.readFile(filePath)
                    .then(data => {
                        return new Promise((resolve, reject) => {
                            parser.parseString(data, (err, result) => {
                                if (err) {
                                    console.log(`Error parsing XML in file: ${filePath}`);
                                    reject(err);
                                } else {
                                    if (result.testsuite?.testcase) {
                                        result.testsuite.testcase.forEach(testcase => {
                                            if (!syntaxErrorOccurred) { 
                                                totalTests++;
                                                if (Array.isArray(testcase.error) && testcase.error.length > 0) {
                                                    const errorDetails = testcase.error[0]; 
                                                    const errorMessage = errorDetails._;                                             
                                                        if (errorMessage.includes('Syntax error')) {
                                                            // const firstLineOfMessage = errorMessage.split('\n')[0];
                                                            console.log(`Compilation Error Detected`);                                                        
                                                            syntaxErrorOccurred = true;                                                                                                    
                                                        }
                                                } else if (testcase.failure) {
                                                    console.log(`Failed ${testcase.$.name}`);
                                                    failedTests++;
                                                } else if (testcase.$.name) {
                                                    console.log(`Passed ${testcase.$.name}`);
                                                    passedTests++;
                                                } else {
                                                    console.log(`Error `);
                                                }
                                            }
                                        });
                                    }
                                    resolve();
                                }
                            });
                        });
                    })
                    .catch(err => {
                        console.log(`Error reading file: ${filePath}`);
                        console.error(err);
                    });
            }
        });

        return Promise.all(promises);
    })
    .then(() => {
        console.log(`**********************************************`);
        console.log(`${color.blue}Total Tests${color.reset}: ${color.blue}${totalTests}${color.reset}, ${color.green}Passed Tests:${color.reset} ${color.green}${passedTests}${color.reset}, ${color.red}Failed Tests:${color.reset} ${color.red}${failedTests}${color.reset}`);
        console.log(`**********************************************`);
    })
    .catch(err => console.log(`Unable to scan directory or directory does not exist: ${directoryPath}`, err));