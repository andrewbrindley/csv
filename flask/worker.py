import time
import json
import logging
import pandas as pd
import io
from datetime import datetime as _dt

# Set up logging for the worker fleet container
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("worker")

try:
    from aws_services import sqs_client, s3_client, SQS_QUEUE_URL, S3_UPLOAD_BUCKET
except ImportError:
    logger.error("Failed to import aws_services. Is boto3 installed and configured?")
    exit(1)

from main import (
    get_ingestion_jobs_collection, 
    get_ingestion_records_collection, 
    get_tenant_data_collection,
    TEMPLATES
)

def poll_and_process():
    if not SQS_QUEUE_URL:
        logger.error("SQS_QUEUE_URL is not configured. Exiting.")
        return

    logger.info(f"Worker polling SQS queue: {SQS_QUEUE_URL}")

    while True:
        try:
            # Poll SQS with Long Polling (WaitTimeSeconds=20)
            response = sqs_client.receive_message(
                QueueUrl=SQS_QUEUE_URL,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=20,
                MessageAttributeNames=['All']
            )

            messages = response.get('Messages', [])
            if not messages:
                continue

            for msg in messages:
                receipt_handle = msg['ReceiptHandle']
                body = msg.get('Body')
                if not body:
                    continue
                
                logger.info(f"Received SQS payload: {body}")
                try:
                    payload = json.loads(body)
                except Exception as e:
                    logger.error(f"Failed to parse SQS payload: {e}")
                    # Delete malformed message so it doesn't get stuck
                    sqs_client.delete_message(QueueUrl=SQS_QUEUE_URL, ReceiptHandle=receipt_handle)
                    continue

                if payload.get("type") == "process_import":
                    # We process the CSV in this synchronous block.
                    # In a highly scaled fleet, one worker processes one template run.
                    process_csv_job(payload)
                
                # Delete the message after successful processing
                sqs_client.delete_message(
                    QueueUrl=SQS_QUEUE_URL,
                    ReceiptHandle=receipt_handle
                )
                logger.info(f"Deleted successfully processed message from SQS.")

        except Exception as e:
            logger.error(f"Worker loop error: {e}")
            time.sleep(5)  # Backoff on general failure


def process_csv_job(payload: dict):
    """
    Downloads the S3 CSV as a streaming body, processes it in chunks of 1000 using Pandas,
    validates it against the Template, and inserts to MongoDB.
    """
    job_id = payload.get("jobId")
    s3_key = payload.get("s3Key")
    template_key = payload.get("templateKey")
    tenant_id = payload.get("tenantId")

    logger.info(f"Starting job {job_id} for template {template_key} from {s3_key}")

    coll_jobs = get_ingestion_jobs_collection()
    coll_records = get_ingestion_records_collection()
    coll_data = get_tenant_data_collection()

    if None in (coll_jobs, coll_records, coll_data):
        logger.error("Database connection missing.")
        return

    # 1. Fetch Job Document to get user mappings
    job_doc = coll_jobs.find_one({"jobId": job_id, "tenantId": tenant_id})
    if not job_doc:
        logger.error(f"Job doc {job_id} not found in DB.")
        return

    # Update job status to 'processing' if it is just picking up
    coll_jobs.update_one({"jobId": job_id}, {"$set": {"status": "processing"}})

    mappings_config = job_doc.get("mappings", {}).get(template_key, {})
    field_to_csv_header = mappings_config.get("mapping", {})

    template_def = TEMPLATES.get(template_key, {})
    template_fields = template_def.get("fields", [])

    # Find the reverse mapping to know which CSV headers we care about
    csv_headers_to_read = list(set(field_to_csv_header.values()))
    if not csv_headers_to_read:
        logger.warning(f"No mapped headers found for template {template_key}")
        # Optionally, mark task total as complete
        return

    try:
        # 2. Get S3 Object Stream
        s3_response = s3_client.get_object(Bucket=S3_UPLOAD_BUCKET, Key=s3_key)
        
        # 3. Stream Process CSV using Pandas chunksize
        chunksize = 1000
        total_rows_processed = 0
        total_errors = 0
        
        # usecols restricts memory to only the headers we actually mapped
        for chunk_df in pd.read_csv(s3_response['Body'], chunksize=chunksize, usecols=csv_headers_to_read):
            total_rows_processed += len(chunk_df)
            
            data_docs = []
            record_docs = []

            # We process this block of 1000 rows
            # Pandas .fillna("") handles NaNs easily
            chunk_df = chunk_df.fillna("")

            for i, row in chunk_df.iterrows():
                row_dict = row.to_dict()
                
                # Build the cleaned data format expected by the tenant collection
                cleaned_data = {}
                row_error = None
                
                # Map CSV columns to Template fields
                for f in template_fields:
                    f_key = f["key"]
                    h_mapped = field_to_csv_header.get(f_key)
                    val = str(row_dict.get(h_mapped, "")) if h_mapped else ""
                    
                    if f.get("required") and not val.strip():
                        if not row_error: 
                            row_error = f"Missing required value for field '{f.get('label', f_key)}'"
                    
                    cleaned_data[f_key] = val.strip()

                if not row_error:
                    data_docs.append({
                        "tenantId": tenant_id,
                        "templateKey": template_key,
                        "data": cleaned_data,
                        "createdAt": _dt.utcnow().isoformat(),
                        "jobId": job_id,
                        "source": "aws_worker"
                    })
                    status = "success"
                else:
                    total_errors += 1
                    status = "error"

                record_docs.append({
                    "jobId": job_id,
                    "tenantId": tenant_id,
                    "templateKey": template_key,
                    "rowIndex": total_rows_processed - len(chunk_df) + i + 1,
                    "status": status,
                    "data": cleaned_data,
                    "error": row_error
                })

            # Bulk Write the chunk of 1000 rows directly to Mongo
            if data_docs:
                coll_data.insert_many(data_docs)
            if record_docs:
                coll_records.insert_many(record_docs)

            logger.info(f"Processed chunk. Total rows so far: {total_rows_processed}. Errors: {total_errors}")

        # Worker Job Finished
        final_status = "completed" if total_errors == 0 else "completed_with_errors"
        
        coll_jobs.update_one(
            {"jobId": job_id, "tenantId": tenant_id},
            {"$inc": {"tasksCompleted": 1}, "$set": {"status": final_status}}
        )
        logger.info(f"Finished processing template {template_key} for {job_id}")

    except Exception as e:
        logger.error(f"Error processing CSV job {job_id}: {e}")
        coll_jobs.update_one(
            {"jobId": job_id, "tenantId": tenant_id},
            {"$set": {"status": "error", "error": str(e)}}
        )


if __name__ == "__main__":
    poll_and_process()
