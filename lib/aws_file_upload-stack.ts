import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { AttributeType, BillingMode, StreamViewType, Table } from "aws-cdk-lib/aws-dynamodb";

export class AwsFileUploadStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // S3 Bucket
        const bucket = new s3.Bucket(this, "FileUploadBucketAwsExam");

        // DynamoDB Table for File Metadata
        const fileMetadataTable = new Table(this, "FileMetadataTable", {
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
    }
}
