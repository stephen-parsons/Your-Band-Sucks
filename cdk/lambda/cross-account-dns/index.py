"""Custom resource: ACM DNS validation + optional ALB alias via cross-account Route53."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sts = boto3.client("sts")
acm = boto3.client("acm")


def _assume_route53_client(role_arn: str, external_id: str) -> Any:
    assumed = sts.assume_role(
        RoleArn=role_arn,
        RoleSessionName="ybs-cross-account-dns",
        ExternalId=external_id,
    )
    creds = assumed["Credentials"]
    return boto3.client(
        "route53",
        aws_access_key_id=creds["AccessKeyId"],
        aws_secret_access_key=creds["SecretAccessKey"],
        aws_session_token=creds["SessionToken"],
    )


def _upsert_record(
    route53: Any,
    hosted_zone_id: str,
    change_batch: dict[str, Any],
) -> None:
    route53.change_resource_record_sets(
        HostedZoneId=hosted_zone_id,
        ChangeBatch=change_batch,
    )


def _delete_record_if_exists(
    route53: Any,
    hosted_zone_id: str,
    record_name: str,
    record_type: str,
) -> None:
    try:
        page = route53.list_resource_record_sets(
            HostedZoneId=hosted_zone_id,
            StartRecordName=record_name,
            StartRecordType=record_type,
            MaxItems="1",
        )
    except ClientError as exc:
        logger.warning("list_resource_record_sets failed: %s", exc)
        return

    records = page.get("ResourceRecordSets", [])
    if not records:
        return
    record = records[0]
    if record.get("Name") != record_name or record.get("Type") != record_type:
        return

    try:
        route53.change_resource_record_sets(
            HostedZoneId=hosted_zone_id,
            ChangeBatch={
                "Comment": "YBS CDK cleanup",
                "Changes": [{"Action": "DELETE", "ResourceRecordSet": record}],
            },
        )
    except ClientError as exc:
        logger.warning("delete record failed: %s", exc)


def _request_certificate(domain_name: str) -> str:
    response = acm.request_certificate(
        DomainName=domain_name,
        ValidationMethod="DNS",
        Tags=[{"Key": "ManagedBy", "Value": "YourBandSucksCDK"}],
    )
    return response["CertificateArn"]


def _wait_for_validation_record(certificate_arn: str) -> dict[str, str]:
    for _ in range(60):
        detail = acm.describe_certificate(CertificateArn=certificate_arn)
        options = detail["Certificate"].get("DomainValidationOptions", [])
        if options:
            resource_record = options[0].get("ResourceRecord")
            if resource_record and resource_record.get("Name"):
                return {
                    "Name": resource_record["Name"],
                    "Type": resource_record["Type"],
                    "Value": resource_record["Value"],
                }
        time.sleep(2)
    raise TimeoutError("Timed out waiting for ACM DNS validation record")


def _certificate_status(certificate_arn: str) -> str:
    detail = acm.describe_certificate(CertificateArn=certificate_arn)
    return detail["Certificate"]["Status"]


def handle_certificate(event: dict[str, Any]) -> dict[str, Any]:
    props = event["ResourceProperties"]
    request_type = event["RequestType"]
    role_arn = props["RoleArn"]
    external_id = props["ExternalId"]
    hosted_zone_id = props["HostedZoneId"]
    domain_name = props["DomainName"]

    if request_type == "Delete":
        physical_id = event.get("PhysicalResourceId", "")
        if physical_id.startswith("arn:aws:acm:"):
            try:
                detail = acm.describe_certificate(CertificateArn=physical_id)
                options = detail["Certificate"].get("DomainValidationOptions", [])
                route53 = _assume_route53_client(role_arn, external_id)
                if options and options[0].get("ResourceRecord"):
                    rr = options[0]["ResourceRecord"]
                    _delete_record_if_exists(
                        route53, hosted_zone_id, rr["Name"], rr["Type"]
                    )
                acm.delete_certificate(CertificateArn=physical_id)
            except ClientError as exc:
                logger.warning("certificate delete cleanup: %s", exc)
        return {"PhysicalResourceId": physical_id}

    # Create or Update
    if request_type == "Update" and str(event.get("PhysicalResourceId", "")).startswith(
        "arn:aws:acm:"
    ):
        certificate_arn = event["PhysicalResourceId"]
    else:
        certificate_arn = _request_certificate(domain_name)

    validation = _wait_for_validation_record(certificate_arn)
    route53 = _assume_route53_client(role_arn, external_id)
    _upsert_record(
        route53,
        hosted_zone_id,
        {
            "Comment": "YBS ACM DNS validation",
            "Changes": [
                {
                    "Action": "UPSERT",
                    "ResourceRecordSet": {
                        "Name": validation["Name"],
                        "Type": validation["Type"],
                        "TTL": 300,
                        "ResourceRecords": [{"Value": validation["Value"]}],
                    },
                }
            ],
        },
    )

    return {
        "PhysicalResourceId": certificate_arn,
        "Data": {"CertificateArn": certificate_arn},
    }


def is_complete_certificate(event: dict[str, Any]) -> dict[str, Any]:
    if event["RequestType"] == "Delete":
        return {"IsComplete": True}

    certificate_arn = event["PhysicalResourceId"]
    status = _certificate_status(certificate_arn)
    logger.info("ACM status for %s: %s", certificate_arn, status)
    if status == "ISSUED":
        return {
            "IsComplete": True,
            "Data": {"CertificateArn": certificate_arn},
        }
    if status in {"FAILED", "VALIDATION_TIMED_OUT", "REVOKED"}:
        raise RuntimeError(f"ACM certificate entered terminal status: {status}")
    return {"IsComplete": False}


def handle_alias(event: dict[str, Any]) -> dict[str, Any]:
    props = event["ResourceProperties"]
    request_type = event["RequestType"]
    role_arn = props["RoleArn"]
    external_id = props["ExternalId"]
    hosted_zone_id = props["HostedZoneId"]
    record_name = props["RecordName"]
    if not record_name.endswith("."):
        record_name = record_name + "."
    alb_dns_name = props["AlbDnsName"]
    alb_hosted_zone_id = props["AlbHostedZoneId"]

    physical_id = f"alias:{record_name}"
    route53 = _assume_route53_client(role_arn, external_id)

    if request_type == "Delete":
        _delete_record_if_exists(route53, hosted_zone_id, record_name, "A")
        _delete_record_if_exists(route53, hosted_zone_id, record_name, "AAAA")
        return {"PhysicalResourceId": physical_id}

    # ALB alias cannot coexist with a CNAME at the same name (e.g. prior CloudFront)
    _delete_record_if_exists(route53, hosted_zone_id, record_name, "CNAME")

    alias_target = {
        "DNSName": alb_dns_name,
        "HostedZoneId": alb_hosted_zone_id,
        "EvaluateTargetHealth": True,
    }
    _upsert_record(
        route53,
        hosted_zone_id,
        {
            "Comment": "YBS ALB alias",
            "Changes": [
                {
                    "Action": "UPSERT",
                    "ResourceRecordSet": {
                        "Name": record_name,
                        "Type": "A",
                        "AliasTarget": alias_target,
                    },
                },
                {
                    "Action": "UPSERT",
                    "ResourceRecordSet": {
                        "Name": record_name,
                        "Type": "AAAA",
                        "AliasTarget": alias_target,
                    },
                },
            ],
        },
    )
    return {"PhysicalResourceId": physical_id}


def on_event(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    logger.info("on_event: %s", json.dumps(event))
    resource = event["ResourceProperties"].get("ResourceKind", "Certificate")
    if resource == "Alias":
        return handle_alias(event)
    return handle_certificate(event)


def is_complete(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    logger.info("is_complete: %s", json.dumps(event))
    resource = event["ResourceProperties"].get("ResourceKind", "Certificate")
    if resource == "Alias":
        return {"IsComplete": True}
    return is_complete_certificate(event)
