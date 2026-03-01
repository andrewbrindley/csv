import sys
import os

# Add flask directory to path
sys.path.append(os.path.join(os.getcwd(), 'flask'))

from db_config import get_raw_uploads_collection, get_ingestion_jobs_collection
from datetime import datetime
import uuid

def verify_db():
    print("Verifying MongoDB connection and collections...")
    
    coll_raw = get_raw_uploads_collection()
    coll_jobs = get_ingestion_jobs_collection()
    
    if coll_raw is None or coll_jobs is None:
        print("Error: Could not connect to MongoDB collections.")
        sys.exit(1)
        
    print(f"Successfully connected to MongoDB. Database: {coll_raw.database.name}")
    
    # Test insertion into csv_raw_uploads
    test_upload_id = str(uuid.uuid4())
    raw_record = {
        "uploadId": test_upload_id,
        "tenantId": "test-tenant",
        "templateKey": "test-template",
        "rawRows": [{"test": "data"}],
        "fileName": "test.csv",
        "uploadedAt": datetime.utcnow()
    }
    
    try:
        coll_raw.insert_one(raw_record)
        print(f"Successfully inserted raw upload {test_upload_id}")
    except Exception as e:
        print(f"Error inserting raw upload: {e}")
        sys.exit(1)
        
    # Test insertion into csv_ingestion_jobs
    test_job_id = str(uuid.uuid4())
    job_record = {
        "jobId": test_job_id,
        "uploadId": test_upload_id,
        "tenantId": "test-tenant",
        "status": "pending",
        "triggeredAt": datetime.utcnow()
    }
    
    try:
        coll_jobs.insert_one(job_record)
        print(f"Successfully inserted ingestion job {test_job_id}")
    except Exception as e:
        print(f"Error inserting ingestion job: {e}")
        sys.exit(1)
        
    print("Verification complete! The DB structure is working as expected.")

if __name__ == "__main__":
    verify_db()
