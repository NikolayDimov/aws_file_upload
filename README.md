# AWS File Upload Service

This project provides a scalable and secure solution for uploading files to AWS. The service processes files, validates their extensions, stores metadata in DynamoDB, and sends notifications for successful or erroneous uploads.

## Architecture Overview

The architecture includes the following AWS services:

-   **S3 Bucket**: Stores files temporarily for processing (TTL set to 30 minutes).
-   **Lambda Functions**:
    -   **File Processing Lambda**: Triggered by S3 file uploads to validate file extensions and store metadata.
    -   **Cleanup Lambda**: Runs on a schedule to clean up expired files from S3 and DynamoDB.
-   **DynamoDB**: A NoSQL database to store metadata about uploaded files (size, extension, upload date).
-   **SNS**: Sends notifications about invalid file uploads to the client.
-   **API Gateway**: Provides a REST API for processing file uploads.

## Project Setup

### Prerequisites

-   **AWS CLI**: Install and configure the AWS CLI with your credentials.
-   **Node.js**: Ensure that Node.js is installed (v14.x or later).
-   **AWS CDK**: Install the AWS CDK CLI globally.

```bash
npm install -g aws-cdk
```
