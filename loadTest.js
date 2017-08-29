'use strict';

const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({apiVersion: '2015-03-31'});

/**
 * Will invoke the given function asynchronously `event.iterations` times.
 */
const load = (event, callback) => {
    const invokeLambdaPromise = iteration => new Promise((resolve, reject) => {
        const payload = event.event;
        payload.iteration = iteration;
        const lambdaParams = {
            FunctionName: process.env.SendRequestFunction,
            InvocationType: 'Event',
            Payload: JSON.stringify(payload),
        };
        lambda.invoke(lambdaParams, (err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });
    const range = n => Array.from({length: n}, (value, key) => key);

    Promise.all(range(event.iterations).map(invokeLambdaPromise)).then(values => {
        console.log(values);
        callback(null, 'Load test complete');
    }).catch(err => {
        console.error(err);
    });
};

exports.handler = (event, context, callback) => {
    console.log(event);
    load(event, callback);
};
