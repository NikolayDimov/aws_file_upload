import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { AttributeType, BillingMode, StreamViewType, Table } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";

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
            },
        });

        // Grant Permissions
        bucket.grantReadWrite(processFileLambda);
        expirationTable.grantReadWriteData(processFileLambda);
    }
}
