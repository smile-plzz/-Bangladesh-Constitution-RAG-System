
# Future Development

This document contains notes on future development tasks for the project.

## DVC Integration

To improve the management of the project's dataset, we plan to integrate Data Version Control (DVC). This will allow for better versioning of the data and make it easier for new contributors to get started.

### Plan:

1.  **Install DVC:**

    ```
    pip install dvc[gdrive]
    ```

2.  **Initialize DVC:**

    ```
    dvc init
    ```

3.  **Configure Remote Storage (Google Drive Example):**

    - Create a folder in Google Drive (e.g., `bdlaws_dvc`).
    - Share the folder with "Anyone with the link".
    - Get the folder ID from the URL.
    - Run the following commands:

      ```
      dvc remote add -d myremote gdrive://<YOUR_FOLDER_ID>
      dvc remote modify myremote gdrive_use_service_account false
      ```

4.  **Track the Data File:**

    ```
    dvc add bdlaws.parquet
    ```

5.  **Update `.gitignore`:**

    Ensure that `bdlaws.parquet` is in the `.gitignore` file.

6.  **Update Documentation:**

    Update the `README.md` and `docs/PROJECT_DETAILS.md` to reflect the new DVC-based workflow.

### New Workflow with DVC:

- **To get the data:** `dvc pull`
- **When the data changes:** `dvc add bdlaws.parquet` and then commit the changes to the `.dvc` file.
