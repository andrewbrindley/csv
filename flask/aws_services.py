import os
import boto3
from botocore.exceptions import ClientError

S3_REGION = os.environ.get("AWS_REGION", "ap-southeast-2")
S3_UPLOAD_BUCKET = os.environ.get("S3_UPLOAD_BUCKET", "csv-app-uploads-dev")
SQS_QUEUE_URL = os.environ.get("SQS_QUEUE_URL", "")

s3_client = boto3.client('s3', region_name=S3_REGION)
sqs_client = boto3.client('sqs', region_name=S3_REGION)

def generate_presigned_upload_url(tenant_id: str, file_name: str, file_type: str, expiration=3600):
    """Generate a presigned URL to share with the React frontend for direct S3 upload."""
    import uuid
    # Construct a safe, collision-free key: tenantId/UUID-filename
    s3_key = f"uploads/{tenant_id}/{uuid.uuid4().hex[:8]}-{file_name}"
    
    try:
        response = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_UPLOAD_BUCKET,
                'Key': s3_key,
                'ContentType': file_type
            },
            ExpiresIn=expiration
        )
    except ClientError as e:
        print(f"Error generating presigned URL: {e}")
        return None, None

    return response, s3_key

def enqueue_import_job(s3_key: str, template_key: str, tenant_id: str, job_id: str):
    """Send a message to SQS to trigger the background worker fleet."""
    import json
    if not SQS_QUEUE_URL:
        print("WARNING: SQS_QUEUE_URL not set. Cannot enqueue job.")
        return False

    message_body = {
        "jobId": job_id,
        "s3Key": s3_key,
        "templateKey": template_key,
        "tenantId": tenant_id,
        "type": "process_import"
    }

    try:
        response = sqs_client.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps(message_body),
            MessageGroupId=tenant_id  # If using FIFO queue
        )
        return True
    except ClientError as e:
        print(f"Error sending SQS message: {e}")
        return False
