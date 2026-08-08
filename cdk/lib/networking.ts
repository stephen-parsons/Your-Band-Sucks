import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { execSync } from "node:child_process";
import * as path from "node:path";
import {
  API_DOMAIN_NAME,
  CROSS_ACCOUNT_DNS_ROLE_ARN,
  CROSS_ACCOUNT_EXTERNAL_ID,
  CrossAccountAlbAliasRecord,
  CrossAccountDnsValidatedCertificate,
  HOSTED_ZONE_ID,
} from "./cross-account-dns";

// RDS DBName must be alphanumeric only (no hyphens/underscores).
const DB_NAME = "appdb";

function getGitCommitSha(): string {
  try {
    return execSync("git rev-parse HEAD", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

export interface NetworkingResourcesProps {
  readonly accessKeyId: string;
  readonly secretAccessKeyObject: secretsmanager.ISecret;
  readonly cognitoUserPoolId: string;
  readonly cognitoClientId: string;
  readonly cognitoIdentityPoolId: string;
  readonly imagesBucketName: string;
  readonly audioFilesBucketName: string;
}

export class NetworkingResources extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly postgresInstance: rds.DatabaseInstance;
  public readonly redisCluster: elasticache.CfnCacheCluster;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly redisSecurityGroup: ec2.SecurityGroup;
  public readonly fargateService: ecs_patterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, id: string, props: NetworkingResourcesProps) {
    super(scope, id);

    const certificate = new CrossAccountDnsValidatedCertificate(
      this,
      "ApiCertificate",
      {
        domainName: API_DOMAIN_NAME,
        hostedZoneId: HOSTED_ZONE_ID,
        roleArn: CROSS_ACCOUNT_DNS_ROLE_ARN,
        externalId: CROSS_ACCOUNT_EXTERNAL_ID,
      },
    );

    this.vpc = new ec2.Vpc(this, "AppDataVpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { cidrMask: 24, name: "Public", subnetType: ec2.SubnetType.PUBLIC },
        {
          cidrMask: 24,
          name: "PrivateApp",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: "PrivateData",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    this.dbSecurityGroup = new ec2.SecurityGroup(this, "PostgresSG", {
      vpc: this.vpc,
      description: "Allow internal VPC access to PostgreSQL",
      allowAllOutbound: true,
    });

    const postgresEngine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_16,
    });

    const postgresParameterGroup = new rds.ParameterGroup(
      this,
      "PostgresParams",
      {
        engine: postgresEngine,
        parameters: {
          "rds.force_ssl": "0",
        },
      },
    );

    this.postgresInstance = new rds.DatabaseInstance(this, "PostgresInstance", {
      engine: postgresEngine,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO,
      ),
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.dbSecurityGroup],
      databaseName: DB_NAME,
      parameterGroup: postgresParameterGroup,
      storageEncrypted: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.redisSecurityGroup = new ec2.SecurityGroup(this, "RedisSG", {
      vpc: this.vpc,
      description: "Allow internal VPC access to Redis",
      allowAllOutbound: true,
    });

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      "RedisSubnetGroup",
      {
        description: "Subnets for Redis cache",
        subnetIds: this.vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
      },
    );

    this.redisCluster = new elasticache.CfnCacheCluster(this, "RedisCluster", {
      cacheNodeType: "cache.t4g.micro",
      engine: "redis",
      numCacheNodes: 1,
      vpcSecurityGroupIds: [this.redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
    });

    const cluster = new ecs.Cluster(this, "ExpressCluster", { vpc: this.vpc });

    const serverDir = path.join(__dirname, "../../server");
    const gitCommit = getGitCommitSha();
    const gitCommitShort = gitCommit.slice(-7);
    // Visible during cdk synth/deploy so you can correlate image builds with git
    console.log(
      `Server image git commit: ${gitCommit} (health reports …${gitCommitShort})`,
    );

    this.fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "ExpressFargateApp",
      {
        cluster,
        cpu: 256,
        memoryLimitMiB: 512,
        desiredCount: 1,
        publicLoadBalancer: true,
        taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        certificate: certificate.certificate,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        redirectHTTP: true,
        circuitBreaker: { rollback: true },
        minHealthyPercent: 100,
        taskImageOptions: {
          image: ecs.ContainerImage.fromAsset(serverDir, {
            platform: ecr_assets.Platform.LINUX_AMD64,
            buildArgs: {
              GIT_COMMIT: gitCommit,
            },
          }),
          containerPort: 3000,
          environment: {
            NODE_ENV: "production",
            AWS_REGION: cdk.Stack.of(this).region,
            GIT_COMMIT: gitCommit,
            DB_HOST: this.postgresInstance.dbInstanceEndpointAddress,
            DB_NAME,
            DB_PORT: "5432",
            REDIS_HOST: this.redisCluster.attrRedisEndpointAddress,
            REDIS_PORT: "6379",
            REDIS_URL: `redis://${this.redisCluster.attrRedisEndpointAddress}:6379`,
            COGNITO_USER_POOL_ID: props.cognitoUserPoolId,
            COGNITO_CLIENT_ID: props.cognitoClientId,
            COGNITO_IDENTITY_POOL_ID: props.cognitoIdentityPoolId,
            S3_IMAGES_BUCKET: props.imagesBucketName,
            S3_AUDIO_FILES_BUCKET: props.audioFilesBucketName,
            IAM_USER_AWS_ACCESS_KEY_ID: props.accessKeyId,
            FORCE_COLOR: "0",
          },
          secrets: {
            IAM_USER_AWS_SECRET_ACCESS_KEY: ecs.Secret.fromSecretsManager(
              props.secretAccessKeyObject,
              "secretAccessKey",
            ),
            DB_PASSWORD: ecs.Secret.fromSecretsManager(
              this.postgresInstance.secret!,
              "password",
            ),
            DB_USER: ecs.Secret.fromSecretsManager(
              this.postgresInstance.secret!,
              "username",
            ),
          },
        },
      },
    );

    this.fargateService.targetGroup.configureHealthCheck({
      path: "/ping",
      healthyHttpCodes: "200",
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    new CrossAccountAlbAliasRecord(this, "ApiAliasRecord", {
      recordName: API_DOMAIN_NAME,
      hostedZoneId: HOSTED_ZONE_ID,
      roleArn: CROSS_ACCOUNT_DNS_ROLE_ARN,
      externalId: CROSS_ACCOUNT_EXTERNAL_ID,
      loadBalancerDnsName: this.fargateService.loadBalancer.loadBalancerDnsName,
      loadBalancerHostedZoneId:
        this.fargateService.loadBalancer.loadBalancerCanonicalHostedZoneId,
    });

    this.postgresInstance.connections.allowFrom(
      this.fargateService.service,
      ec2.Port.tcp(5432),
      "Allow Express API to access Postgres Database",
    );

    this.redisSecurityGroup.addIngressRule(
      this.fargateService.service.connections.securityGroups[0],
      ec2.Port.tcp(6379),
      "Allow Express API to access Redis Cluster",
    );
  }
}
