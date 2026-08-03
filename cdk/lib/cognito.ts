import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { requireEnv } from "./env";

/**
 * References existing Cognito user pool, client, identity pool, and auth role.
 * Does not create or replace pools (preserves users).
 */
export class CognitoResources extends Construct {
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolClient: cognito.IUserPoolClient;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;
  public readonly identityPoolId: string;
  public readonly authenticatedRole: iam.IRole;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.userPoolId = requireEnv("COGNITO_USER_POOL_ID");
    this.userPoolClientId = requireEnv("COGNITO_CLIENT_ID");
    this.identityPoolId = requireEnv("COGNITO_IDENTITY_POOL_ID");

    this.userPool = cognito.UserPool.fromUserPoolId(
      this,
      "UserPool",
      this.userPoolId,
    );

    this.userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
      this,
      "UserPoolClient",
      this.userPoolClientId,
    );

    this.authenticatedRole = iam.Role.fromRoleArn(
      this,
      "AuthenticatedRole",
      requireEnv("COGNITO_AUTHENTICATED_ROLE_ARN"),
      { mutable: true },
    );

    new cdk.CfnOutput(this, "UserPoolId", { value: this.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClientId,
    });
    new cdk.CfnOutput(this, "IdentityPoolId", { value: this.identityPoolId });
    new cdk.CfnOutput(this, "Region", {
      value: cdk.Stack.of(this).region,
    });
  }
}
