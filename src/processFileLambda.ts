import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb"; // Importing low-level DynamoDB client and command
import * as AWS from "aws-sdk";

const s3 = new AWS.S3();
const dynamoClient = new DynamoDBClient({});

const TABLE_NAME = process.env.TABLE_NAME;

export const processFileLambda = async (event: any) => {
    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = record.s3.object.key;
        const size = record.s3.object.size;

        const expirationTime = Math.floor(Date.now() / 1000) + 30 * 60;
        const fileExtension = key.split(".").pop();

        // Construct the PutItem parameters for low-level API
        const putItemParams = {
            TableName: TABLE_NAME,
            Item: {
                fileKey: { S: key },
                expirationTime: { N: expirationTime.toString() },
                fileExtension: { S: fileExtension || "" },
                fileSize: { N: size.toString() },
                uploadTime: { S: new Date().toISOString() },
            },
        };

        console.log("DynamoDB Params:", putItemParams);

        // Use PutItemCommand to insert the metadata into DynamoDB
        try {
            await dynamoClient.send(new PutItemCommand(putItemParams));
            console.log(`Metadata for ${key} stored successfully`);
        } catch (error) {
            console.error("Error storing metadata for", key, error);
        }
    }
};
