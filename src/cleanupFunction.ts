import { DynamoDBClient, ScanCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import * as AWS from "aws-sdk";

const s3 = new AWS.S3();
const dynamoClient = new DynamoDBClient({});

const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

export const cleanupFunction = async (event: any) => {
    const now = Math.floor(Date.now() / 1000);

    // Query DynamoDB for expired files
    const expiredFiles = await dynamoClient.send(
        new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: "expirationTime <= :now",
            ExpressionAttributeValues: { ":now": { N: now.toString() } },
        })
    );

    for (const file of expiredFiles.Items || []) {
        const fileKey = file.fileKey.S;

        if (fileKey) {
            // Delete file from S3
            await s3
                .deleteObject({
                    Bucket: BUCKET_NAME,
                    Key: fileKey,
                })
                .promise();

            console.log(`Deleted file: ${fileKey}`);

            // Delete metadata from DynamoDB
            await dynamoClient.send(
                new DeleteItemCommand({
                    TableName: TABLE_NAME,
                    Key: { fileKey: { S: fileKey } },
                })
            );

            console.log(`Deleted metadata for file: ${fileKey}`);
        }
    }

    return {
        statusCode: 200,
        body: "Cleanup function processed successfully",
    };
};
