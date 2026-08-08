import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { requireEnv } from "./env";

/**
 * References existing S3 buckets (does not create or delete them).
 */
export class S3Resources extends Construct {
  public readonly audioFilesBucket: s3.IBucket;
  public readonly imagesBucket: s3.IBucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.audioFilesBucket = s3.Bucket.fromBucketName(
      this,
      "AudioFilesBucket",
      requireEnv("S3_AUDIO_FILES_BUCKET"),
    );

    this.imagesBucket = s3.Bucket.fromBucketName(
      this,
      "ImagesBucket",
      requireEnv("S3_IMAGES_BUCKET"),
    );

    new cdk.CfnOutput(this, "AudioFilesBucketName", {
      value: this.audioFilesBucket.bucketName,
    });
    new cdk.CfnOutput(this, "ImagesBucketName", {
      value: this.imagesBucket.bucketName,
    });
  }
}
