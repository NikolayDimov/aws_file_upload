import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { CfnOutput } from "aws-cdk-lib";
import { AttributeType, BillingMode, StreamViewType, Table } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Subscription, SubscriptionProtocol, Topic } from "aws-cdk-lib/aws-sns";

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

        // SNS Topic
        const errorTopic = new Topic(this, "ErrorTopic", {
            topicName: "ErrorTopicAws",
        });

        // Lambda Function to Handle File Upload
        const processFileLambda = new NodejsFunction(this, "ProcessFileLambda", {
            runtime: Runtime.NODEJS_20_X,
            handler: "processFileLambda",
            entry: `${__dirname}/../src/processFileLambda.ts`,
            environment: {
                TABLE_NAME: expirationTable.tableName,
                BUCKET_NAME: bucket.bucketName,
                TOPIC_ARN: errorTopic.topicArn,
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
        expirationTable.grantReadWriteData(processFileLambda);
        expirationTable.grantReadWriteData(cleanupLambda);
        errorTopic.grantPublish(processFileLambda);
        errorTopic.grantPublish(cleanupLambda);

        // Schedule Cleanup Lambda
        new cdk.aws_events.Rule(this, "ScheduleCleanupRule", {
            schedule: cdk.aws_events.Schedule.rate(cdk.Duration.minutes(5)),
            targets: [new cdk.aws_events_targets.LambdaFunction(cleanupLambda)],
        });

        // API Gateway
        const api = new RestApi(this, "ProcessorApi");
        const resource = api.root.addResource("processJSON");
        resource.addMethod("POST", new LambdaIntegration(processFileLambda));

        // Email Subscription
        new Subscription(this, "ErrorSubscription", {
            topic: errorTopic,
            protocol: SubscriptionProtocol.EMAIL,
            endpoint: "atclient115@gmail.com",
        });

        // REST API output endpoint
        new CfnOutput(this, "RESTApiEndpoint", {
            value: `https://${api.restApiId}.execute-api.eu-center-1.amazonaws.com/prod/processJSON`,
        });

        // Outputs
        new CfnOutput(this, "TopicArn", {
            value: errorTopic.topicArn,
        });
    }
}
