import * as cdk from "aws-cdk-lib";
import { CfnOutput, SecretValue } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { CognitoResources } from "./cognito";
import { API_DOMAIN_NAME } from "./cross-account-dns";
import { NetworkingResources } from "./networking";
import { S3Resources } from "./s3";

export class MainBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { audioFilesBucket, imagesBucket } = new S3Resources(this, "S3");

    const cognito = new CognitoResources(this, "Cognito");

    imagesBucket.grantRead(cognito.authenticatedRole);

    const apiServiceUser = new iam.User(this, "ApiServiceUser", {
      userName: "api-service-user",
    });

    imagesBucket.grantPut(apiServiceUser);
    audioFilesBucket.grantReadWrite(apiServiceUser);

    const accessKey = new iam.AccessKey(this, "ApiServiceUserAccessKey", {
      user: apiServiceUser,
    });

    const secretAccessKeyObject = new secretsmanager.Secret(
      this,
      "UserSecretKeyStore",
      {
        secretName: "amplify/storage-worker/credentials",
        secretObjectValue: {
          accessKeyId: SecretValue.unsafePlainText(accessKey.accessKeyId),
          secretAccessKey: accessKey.secretAccessKey,
        },
      },
    );

    new CfnOutput(this, "StorageWorkerAccessKeyId", {
      value: accessKey.accessKeyId,
      description: "The Access Key ID for the storage worker user",
    });

    const network = new NetworkingResources(this, "Networking", {
      accessKeyId: accessKey.accessKeyId,
      secretAccessKeyObject,
      cognitoUserPoolId: cognito.userPoolId,
      cognitoClientId: cognito.userPoolClientId,
      cognitoIdentityPoolId: cognito.identityPoolId,
      imagesBucketName: imagesBucket.bucketName,
      audioFilesBucketName: audioFilesBucket.bucketName,
    });

    new CfnOutput(this, "ApiDomainName", {
      value: API_DOMAIN_NAME,
      description: "Public API hostname",
    });

    new CfnOutput(this, "LoadBalancerDnsName", {
      value: network.fargateService.loadBalancer.loadBalancerDnsName,
      description: "ALB DNS name",
    });

    new CfnOutput(this, "FargateListenerPort", {
      value: network.fargateService.listener.port.toString(),
      description: "Fargate listener port",
    });

    new CfnOutput(this, "RedisEndpoint", {
      value: network.redisCluster.attrRedisEndpointAddress,
      description: "Redis endpoint",
    });

    new CfnOutput(this, "PostgresEndpoint", {
      value: network.postgresInstance.dbInstanceEndpointAddress,
      description: "Postgres endpoint",
    });

    new CfnOutput(this, "VpcId", {
      value: network.vpc.vpcId,
      description: "VPC ID",
    });
  }
}
