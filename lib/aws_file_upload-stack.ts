import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { AttributeType, BillingMode, StreamViewType, Table } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";

export class AwsFileUploadStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // S3 Bucket
        const bucket = new s3.Bucket(this, "FileUploadBucketAwsExam");

        // DynamoDB Table for File Metadata
        const expirationTable = new Table(this, "expirationTable", {
            partitionKey: {
                name: "fileId",
                type: AttributeType.STRING,
            },
            sortKey: {
                name: "uploadDate",
                type: AttributeType.STRING,
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: "ttl",
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Lambda Function to Handle File Upload
        const processFileLambda = new NodejsFunction(this, "ProcessFileLambda", {
            runtime: Runtime.NODEJS_20_X,
            handler: "processFileLambda",
            entry: `${__dirname}/../src/processFileLambda.ts`,
            environment: {
                TABLE_NAME: expirationTable.tableName,
                BUCKET_NAME: bucket.bucketName,
                TOPIC_ARN: "arn:aws:sns:region:account-id:topic-name", // Replace with actual SNS Topic ARN
            },
        });

        // Grant Permissions
        bucket.grantReadWrite(processFileLambda);
        expirationTable.grantReadWriteData(processFileLambda);

        // Trigger Lambda on file upload
        bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3Notifications.LambdaDestination(processFileLambda));

        // Scheduled Lambda for Cleanup
        const cleanupLambda = new NodejsFunction(this, "CleanupLambda", {
            runtime: Runtime.NODEJS_20_X,
            handler: "cleanupFunction",
            entry: `${__dirname}/../src/cleanupFunction.ts`,
            environment: {
                TABLE_NAME: expirationTable.tableName,
                BUCKET_NAME: bucket.bucketName,
            },
        });

        // Grant Permissions to Cleanup Lambda
        bucket.grantReadWrite(cleanupLambda);
        expirationTable.grantReadWriteData(cleanupLambda);

        // Schedule Cleanup Lambda
        new cdk.aws_events.Rule(this, "ScheduleCleanupRule", {
            schedule: cdk.aws_events.Schedule.rate(cdk.Duration.minutes(5)),
            targets: [new cdk.aws_events_targets.LambdaFunction(cleanupLambda)],
        });
    }
}
