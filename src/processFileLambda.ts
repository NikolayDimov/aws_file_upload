import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import * as AWS from "aws-sdk";

const s3 = new AWS.S3();
const dynamoClient = new DynamoDBClient({});

const TABLE_NAME = process.env.TABLE_NAME!;
const TOPIC_ARN = process.env.TOPIC_ARN!;

const allowedExtensions = ["pdf", "jpg", "png"];

export const processFileLambda = async (event: any) => {
    const snsClient = new AWS.SNS();

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = record.s3.object.key;
        const size = record.s3.object.size;
        const fileExtension = key.split(".").pop()?.toLowerCase();

        // Validate file extension
        if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
            const message = `Error: Invalid file extension for file ${key}. Allowed extensions are .pdf, .jpg, .png.`;

            await snsClient
                .publish({
                    TopicArn: TOPIC_ARN,
                    Message: message,
                })
                .promise();

            console.log(message);

            // Optionally delete the invalid file from S3
            try {
                await s3
                    .deleteObject({
                        Bucket: bucket,
                        Key: key,
                    })
                    .promise();
                console.log(`Deleted invalid file: ${key}`);
            } catch (deleteError) {
                console.error(`Error deleting invalid file ${key}:`, deleteError);
            }

            return { statusCode: 400, body: message };
        }

        // Construct the PutItem parameters for DynamoDB
        const expirationTime = Math.floor(Date.now() / 1000) + 30 * 60;
        const putItemParams = {
            TableName: TABLE_NAME,
            Item: {
                fileKey: { S: key },
                expirationTime: { N: expirationTime.toString() },
                fileExtension: { S: fileExtension },
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
            return { statusCode: 500, body: `Error storing metadata for ${key}` };
        }
    }

    return {
        statusCode: 200,
        body: "File processed successfully",
    };
};
