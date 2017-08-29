'use strict';
const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const lambda = new AWS.Lambda({apiVersion: '2015-03-31'});

// --------------- Helpers to build responses which match the structure of the necessary dialog actions -----------------------

const elicitSlot = (sessionAttributes, intentName, slots, slotToElicit, message) => {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message,
        },
    };
};

const close = (sessionAttributes, fulfillmentState, message) => {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
};

const delegate = (sessionAttributes, slots) => {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
    };
};

// ---------------- Helper Functions --------------------------------------------------


const buildValidationResult = (isValid, violatedSlot, messageContent) => {
    if (messageContent === null) {
        return {
            isValid,
            violatedSlot,
        };
    }
    return {
        isValid,
        violatedSlot,
        message: {contentType: 'PlainText', content: messageContent},
    };
};

const extractHostname = url => {
    let hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf("://") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];

    return hostname;
};

const isPositiveInteger = s => {
    return /^\+?[1-9][\d]*$/.test(s);
};

const isValidURL = str => {
    let regex = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
    return regex.test(str);
};

const validateLoadTest = (url, count) => {
    console.log(url + ", " + count);
    if (count) {
        if (!isPositiveInteger(count)) {
            return buildValidationResult(false, 'count', 'I did not understand that, Please tell me how many requests you want to send?');
        }
    }
    if (url) {
        if (!isValidURL(url)) {
            return buildValidationResult(false, 'url', 'You url is incorrect. Please tell me again the url.');
        }
    }
    return buildValidationResult(true, null, null);
};

// --------------- Functions that control the bot's behavior -----------------------

/**
 * Performs dialog management and fulfillment for ordering flowers.
 *
 * Beyond fulfillment, the implementation of this intent demonstrates the use of the elicitSlot dialog action
 * in slot validation and re-prompting.
 *
 */
const runLoadTest = (intentRequest, callback) => {
    const url = intentRequest.currentIntent.slots.url;
    const count = intentRequest.currentIntent.slots.count;
    const source = intentRequest.invocationSource;

    console.log("source: " + source);
    const validationResult = validateLoadTest(url, count);
    if (source === 'DialogCodeHook') {
        // Perform basic validation on the supplied input slots.  Use the elicitSlot dialog action to re-prompt for the first violation detected.
        const slots = intentRequest.currentIntent.slots;
        if (!validationResult.isValid) {
            slots[`${validationResult.violatedSlot}`] = null;
            callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
            return;
        }

        const outputSessionAttributes = intentRequest.sessionAttributes || {};

        outputSessionAttributes.message = "Start " + count + " Lambda functions and sending request to " + url;
        callback(delegate(outputSessionAttributes, intentRequest.currentIntent.slots));
        return;
    }

    if (source === 'FulfillmentCodeHook') {
        let data = {
            "iterations": count,
            "event": {
                "options": {
                    "host": extractHostname(url),
                    "path": "/",
                    "method": "GET"
                }
            }
        };

        const lambdaParams = {
            FunctionName: process.env.LoadTestFunction,
            InvocationType: 'Event',
            Payload: JSON.stringify(data),
        };
        const invokeLambdaPromise = () => new Promise((resolve, reject) => {
            lambda.invoke(lambdaParams, (err, data) => {
                if (err) reject(err);
                resolve(data);
            });
        });
        invokeLambdaPromise()
            .then(() => {
                console.log("Invoked Load test!");
                callback(close(intentRequest.sessionAttributes, 'Fulfilled',
                    {
                        contentType: 'PlainText',
                        content: `Sending ${count} requests to ${url} . Check the AutoScaling out after 2 mins!`
                    }));
            })
            .catch((err) => {
                console.error(err);
                callback(close(intentRequest.sessionAttributes, 'Fulfilled', err));
            });
    }
};

// --------------- Intents -----------------------

/**
 * Called when the user specifies an intent for this skill.
 */
const dispatch = (intentRequest, callback) => {
    console.log(`dispatch userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);
    const intentName = intentRequest.currentIntent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'RunLoadTest') {
        return runLoadTest(intentRequest, callback);
    }
    throw new Error(`Intent with name ${intentName} not supported`);
};

// --------------- Main handler -----------------------

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        // By default, treat the user request as coming from the America/New_York time zone.
        process.env.TZ = 'Asia/Hong_Kong';
        console.log(`event.bot.name=${event.bot.name}`);

        dispatch(event, (response) => callback(null, response));
    } catch (err) {
        callback(err);
    }
};
