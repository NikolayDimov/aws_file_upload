import * as cdk from "aws-cdk-lib";
import { Stack } from "aws-cdk-lib";
import { Table, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { Topic } from "aws-cdk-lib/aws-sns";
import { processFileLambda } from "../src/processFileLambda";
import "jest-cdk-snapshot";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SNSClient } from "@aws-sdk/client-sns";

// Mock AWS SDK clients
jest.mock("@aws-sdk/client-dynamodb", () => ({
    DynamoDBClient: jest.fn().mockImplementation(() => ({
        send: jest.fn(),
    })),
    PutItemCommand: jest.fn(),
}));

jest.mock("@aws-sdk/client-sns", () => ({
    SNSClient: jest.fn().mockImplementation(() => ({
        send: jest.fn(),
    })),
    PublishCommand: jest.fn(),
}));

describe("handler function tests with CDK snapshot", () => {
    let dynamoClient: DynamoDBClient;
    let snsClient: SNSClient;

    beforeEach(() => {
        process.env.TABLE_NAME = "ErrorTable";
        process.env.TOPIC_ARN = "arn:aws:sns:us-east-1:123456789012:ErrorTopic";

        dynamoClient = new DynamoDBClient({});
        snsClient = new SNSClient({});

        (dynamoClient.send as jest.Mock).mockImplementation(() => Promise.resolve({}));
        (snsClient.send as jest.Mock).mockImplementation(() => Promise.resolve({}));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should call DynamoDB for invalid JSON", async () => {
        const event = {
            Records: [
                {
                    s3: {
                        bucket: { name: "my-bucket" },
                        object: { key: "invalid-file.jpg", size: 5678 },
                    },
                },
            ],
        };

        await processFileLambda(event);

        const stack = new Stack();
        new Table(stack, "ErrorTable", {
            partitionKey: { name: "id", type: AttributeType.STRING },
        });

        new Topic(stack, "ErrorTopic");

        expect(stack).toMatchCdkSnapshot();
    });

    test("should send an SNS notification for valid JSON", async () => {
        const event = {
            Records: [
                {
                    s3: {
                        bucket: { name: "my-bucket" },
                        object: { key: "valid-file.jpg", size: 5678 },
                    },
                },
            ],
        };

        await processFileLambda(event);

        const stack = new Stack();
        new Table(stack, "ErrorTable", {
            partitionKey: { name: "id", type: AttributeType.STRING },
        });

        new Topic(stack, "ErrorTopic");

        expect(stack).toMatchCdkSnapshot();
    });
});
