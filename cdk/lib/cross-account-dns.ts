import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { requireEnv } from "./env";

export const DNS_ACCOUNT_ID = requireEnv("DNS_ACCOUNT_ID");
export const HOSTED_ZONE_ID = requireEnv("HOSTED_ZONE_ID");
export const ZONE_NAME = requireEnv("DNS_ZONE_NAME");
export const API_DOMAIN_NAME = requireEnv("API_DOMAIN_NAME");
export const CROSS_ACCOUNT_DNS_ROLE_ARN = requireEnv(
  "CROSS_ACCOUNT_DNS_ROLE_ARN",
);
export const CROSS_ACCOUNT_EXTERNAL_ID = requireEnv(
  "CROSS_ACCOUNT_EXTERNAL_ID",
);

interface CrossAccountDnsValidatedCertificateProps {
  readonly domainName: string;
  readonly hostedZoneId: string;
  readonly roleArn: string;
  readonly externalId: string;
}

/**
 * Requests an ACM certificate in this account and validates it by writing
 * DNS CNAMEs in a Route53 hosted zone in another account (via assume-role).
 */
export class CrossAccountDnsValidatedCertificate extends Construct {
  public readonly certificate: acm.ICertificate;
  public readonly certificateArn: string;

  constructor(
    scope: Construct,
    id: string,
    props: CrossAccountDnsValidatedCertificateProps,
  ) {
    super(scope, id);

    const handler = new lambda.Function(this, "Handler", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.on_event",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../lambda/cross-account-dns"),
      ),
      timeout: cdk.Duration.minutes(5),
      description: "Cross-account ACM DNS validation for YBS",
    });

    const isComplete = new lambda.Function(this, "IsComplete", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.is_complete",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../lambda/cross-account-dns"),
      ),
      timeout: cdk.Duration.minutes(2),
      description: "Poll ACM certificate status for YBS",
    });

    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "acm:RequestCertificate",
          "acm:DescribeCertificate",
          "acm:DeleteCertificate",
          "acm:AddTagsToCertificate",
        ],
        resources: ["*"],
      }),
    );
    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [props.roleArn],
      }),
    );
    isComplete.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["acm:DescribeCertificate"],
        resources: ["*"],
      }),
    );

    const provider = new cr.Provider(this, "Provider", {
      onEventHandler: handler,
      isCompleteHandler: isComplete,
      queryInterval: cdk.Duration.seconds(30),
      totalTimeout: cdk.Duration.hours(1),
    });

    const resource = new cdk.CustomResource(this, "Resource", {
      serviceToken: provider.serviceToken,
      properties: {
        ResourceKind: "Certificate",
        DomainName: props.domainName,
        HostedZoneId: props.hostedZoneId,
        RoleArn: props.roleArn,
        ExternalId: props.externalId,
      },
    });

    // Provider PhysicalResourceId is the ACM certificate ARN
    this.certificateArn = resource.ref;
    this.certificate = acm.Certificate.fromCertificateArn(
      this,
      "Certificate",
      this.certificateArn,
    );
  }
}

interface CrossAccountAlbAliasRecordProps {
  readonly recordName: string;
  readonly hostedZoneId: string;
  readonly roleArn: string;
  readonly externalId: string;
  readonly loadBalancerDnsName: string;
  readonly loadBalancerHostedZoneId: string;
}

/**
 * Creates A/AAAA alias records for an ALB in a cross-account hosted zone.
 */
export class CrossAccountAlbAliasRecord extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: CrossAccountAlbAliasRecordProps,
  ) {
    super(scope, id);

    const handler = new lambda.Function(this, "Handler", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.on_event",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../lambda/cross-account-dns"),
      ),
      timeout: cdk.Duration.minutes(2),
      description: "Cross-account ALB alias record for YBS",
    });

    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [props.roleArn],
      }),
    );

    const provider = new cr.Provider(this, "Provider", {
      onEventHandler: handler,
    });

    new cdk.CustomResource(this, "Resource", {
      serviceToken: provider.serviceToken,
      properties: {
        ResourceKind: "Alias",
        RecordName: props.recordName,
        HostedZoneId: props.hostedZoneId,
        RoleArn: props.roleArn,
        ExternalId: props.externalId,
        AlbDnsName: props.loadBalancerDnsName,
        AlbHostedZoneId: props.loadBalancerHostedZoneId,
      },
    });
  }
}
