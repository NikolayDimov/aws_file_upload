import { Stack } from "aws-cdk-lib";
import { Table, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { Topic } from "aws-cdk-lib/aws-sns";
import "jest-cdk-snapshot";

describe("Infrastructure Snapshot Test", () => {
    it("should match the CloudFormation snapshot", () => {
        const stack = new Stack();

        new Table(stack, "ErrorTable", {
            partitionKey: { name: "id", type: AttributeType.STRING },
        });

        new Topic(stack, "ErrorTopic");

        expect(stack).toMatchCdkSnapshot();
    });
});
