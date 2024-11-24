import * as cdk from "aws-cdk-lib";
import { AwsFileUploadStack } from "../lib/aws_file_upload-stack";
import "jest-cdk-snapshot";

describe("AwsFileUploadStack", () => {
    it("should match the CloudFormation snapshot", () => {
        const stack = new cdk.Stack();

        new AwsFileUploadStack(stack, "TestStack");

        expect(stack).toMatchCdkSnapshot();
    });
});
