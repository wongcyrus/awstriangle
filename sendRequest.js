'use strict';

const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const http = require('http');
const kinesis = new AWS.Kinesis();

exports.handler = (event, context, callback) => {
    console.log(event);

    AWSXRay.captureAsyncFunc('Server Response Time', (subsegment) => {
        sendRequest(event,context)
            .then(data => {
                subsegment.close();
                return writeToKinesis(data)
            })
            .then(data => callback(null, data))
            .catch(err => callback(err));
    });
};

const sendRequest = (event, context) => new Promise((resolve, reject) => {
    let startTime = new Date();
    const req = http.request(event.options, (res) => {
        let body = '';
        console.log('Status:', res.statusCode);
        console.log('Headers:', JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log('Successfully processed HTTP response');
            // If we know it's JSON, parse it
            if (res.headers['content-type'] === 'application/json') {
                body = JSON.parse(body);
            }
            console.log(truncateString(body, 50));

            let data = {
                awsRequestId: context.awsRequestId,
                instanceId: truncateString(body, 50),
                startTime: startTime,
                completeTime: new Date()
            };
            resolve(data);
        });
    });
    req.on('error', reject);
    req.write(JSON.stringify(event));
    req.end();
});

const writeToKinesis = data => new Promise((resolve, reject) => {
    let recordParams = {
        Data: JSON.stringify(data),
        PartitionKey: data.awsRequestId,
        StreamName: process.env.EC2ResponseStream
    };

    kinesis.putRecord(recordParams, (err, data) => {
        if (err) reject(err);
        resolve(data);
    });
});

const truncateString = (str, num) => {
    return str.length > num ? str.slice(0, num > 3 ? num - 3 : num) + "..." : str;
};