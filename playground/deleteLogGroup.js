"use strict";

const AWS = require("aws-sdk");

let cloudwatchlogs = new AWS.CloudWatchLogs({
    region: 'us-east-1'
});

let deleteLogGroup = logGroup => new Promise((resolve, reject)=> {
    cloudwatchlogs.deleteLogGroup({
        logGroupName: logGroup.logGroupName
    },  (err, data)=> {
        if (err) reject(err); // an error occurred
        else     resolve(data);           // successful response
    });
});

//let isCloudLabTempLogs = name => true;
let isCloudLabTempLogs = name => name.indexOf("LoadTest") > 0 ;

new Promise((resolve, reject)=> {
    cloudwatchlogs.describeLogGroups({},  (err, data)=> {
        if (err) console.log(err, err.stack); // an error occurred
        else     resolve(data.logGroups);           // successful response
    });
}).then(data => new Promise((resolve, reject)=> {

    resolve(data.filter(l => isCloudLabTempLogs(l.logGroupName)).map(deleteLogGroup));

}))
    .then(console.log, console.error);