This project demonstrates AWS Triangle pattern - AWS ALB, CloudWatch and AutoScaling.
It contains 2 CloudFormation templates - 
1. AWSTriangle.yaml - the AWS triangle stack and it scales in or out based on the number of request.
2. ServerlessLoadTest.yaml - the Lambda functions for the loading test Lex chatbot.

Since AWS Lex is not supported by CloudFormation at this moment, so you have to create the Lex Chatbot manually.
I will try to create Custom Resource in the future.

You can set the test event for the LoatTest Lambda function.

{
  "iterations": 1,
  "event": {
    "options": {
      "host": "http://it.vtc.edu.hk",
      "path": "/",
      "method": "GET"
    }
  }
}

at this moment. 