# Logger tag for Google Tag Manager Server Side

The **Logger** tag for Server-Side Google Tag Manager (sGTM) helps track and debug requests sent to your server container. It allows you to log event data, request details, and custom information to stape.io, GCP, BigQuery, or other cloud platform logs.
This tag also allows logging of POST request bodies, which are not included in logs for GCP or Stape by default.

## Features

With the Logger tag, you can:
- Log all **Event Data**
- Log the **Request URL**
- Log the **Request Body**
- Parse **Request Body** as JSON
- Add **Custom Information**
- Choose a logging destination:
  - **Console**
  - **BigQuery**

## How to use Logger tag

- [Troubleshooting server-side tagging using server GTM logs](https://stape.io/blog/troubleshooting-server-side-tagging-using-server-gtm-logs)

### Setup Instructions
1. Add the Logger tag to your sGTM container.
2. Configure the **log destination** (Console or BigQuery).
3. Enable the desired logging options (e.g., event data, request body, custom fields).
4. If using BigQuery, provide the **Project ID**, **Dataset ID**, and **Table ID**. 
[Make sure to create the table following the correct schema](#bigquery-table).
5. Use the **Preview mode** in sGTM to test logging behavior.
6. Save and publish your sGTM container.

### BigQuery table

If you use BigQuery as the logging destination, then you must create a table with the following schema:

| Field Name       | Type     | Mode    | Description |
|-----------------|----------|----------|-------------|
| `timestamp`     | INTEGER  | REQUIRED | Unix epoch timestamp (milliseconds). |
| `type`          | STRING   | REQUIRED | Log type: `Message`. |
| `trace_id`      | STRING   | REQUIRED | Unique identifier for the request (from the `trace-id` header). |
| `tag_name`      | STRING   | REQUIRED | Name of the GTM tag template generating the log: `Logger`. |
| `event_name`    | STRING   | REQUIRED | The name of the event that triggered the tag (the content of `event_name` variable in the Event Data), or `Logger` by default. |
| `event_data`    | JSON     | NULLABLE | JSON string representation of Event Data object. |
| `request_url`   | STRING   | NULLABLE | URL Path of the request triggering the event in the container. |
| `request_body`  | JSON     | NULLABLE | JSON string representation of the request triggering the event in the container. |
| `custom_data`   | JSON     | NULLABLE | JSON string representation of any custom data supplied to the tag as key-value pairs. |

```json
[
    {
        "name": "timestamp",
        "type": "INTEGER",
        "mode": "REQUIRED",
        "description": "Unix epoch timestamp (milliseconds)."
    },
    {
        "name": "type",
        "type": "STRING",
        "mode": "REQUIRED",
        "description": "Log type: `Message`."
    },
    {
        "name": "trace_id",
        "type": "STRING",
        "mode": "REQUIRED",
        "description": "Unique identifier for the request (from the `trace-id` header)."
    },
    {
        "name": "tag_name",
        "type": "STRING",
        "mode": "REQUIRED",
        "description": "Name of the GTM tag template generating the log: `Logger`."
    },
    {
        "name": "event_name",
        "type": "STRING",
        "mode": "REQUIRED",
        "description": "The name of the event that triggered the tag (the content of `event_name` variable in the Event Data), or `Logger` by default."
    },
    {
        "name": "event_data",
        "type": "JSON",
        "mode": "NULLABLE",
        "description": "JSON string representation of Event Data object."
    },
    {
        "name": "request_url",
        "type": "STRING",
        "mode": "NULLABLE",
        "description": "URL Path of the request that triggered the event in the container."
    },
    {
        "name": "request_body",
        "type": "JSON",
        "mode": "NULLABLE",
        "description": "JSON string representation of the request body of the request that triggered the event in the container."
    },
    {
        "name": "custom_data",
        "type": "JSON",
        "mode": "NULLABLE",
        "description": "JSON string representation of any custom data supplied to the tag as key-value pairs."
    }
]
```

#### Creating the BigQuery Table

It's possible to create the table using the UI or via SQL.

Before creating the table you can choose a **partitioning setting** and also a **clustering setting**. It's not required, but this can help optimize performance and costs associated with this table.
Suggestion: **partition** by `ingestion time - day` and **cluster** by `tag_name` or `type`.

- Method 1: Using the BigQuery UI

Go to **BigQuery project**; choose or create a **dataset**; for the chosen dataset click the three vertical dots next to its name and select **"Create table"**.

Give the table a name and click `Edit as text` under the _Schema_ section. 
Copy and paste the [table schema above](#bigquery-table).

![Table creation on UI](/images/table-creation.png)

Optionally, you can define the **partitioning setting** and **clustering setting**.
![Table partitioning and clustering settings](/images/table-partitioning-and-clustering.png)

- Method 2: Using SQL

Go to **BigQuery project**; choose or create a **dataset**; open a **new query** and run the following command.
Optionally, you can define the **partitioning setting** and **clustering setting**.
```sql
CREATE TABLE `<your_project_id>.<your_dataset_id>.<your_table_id>` (
  -- Required fields
  timestamp INTEGER NOT NULL OPTIONS(description="Unix epoch timestamp (milliseconds)."),
  type STRING NOT NULL OPTIONS(description="Log type: `Message`."),
  trace_id STRING NOT NULL OPTIONS(description="Unique identifier for the request (from the `trace-id` header)."),
  tag_name STRING NOT NULL OPTIONS(description="Name of the GTM tag template generating the log: `Logger`."),
  event_name STRING NOT NULL OPTIONS(description="The name of the event that triggered the tag (the content of `event_name` variable in the Event Data), or `Logger` by default."),
  -- Optional fields
  event_data JSON OPTIONS(description="JSON string representation of Event Data object."),
  request_url STRING OPTIONS(description="URL Path of the request that triggered the event in the container."),
  request_body JSON OPTIONS(description="JSON string representation of the request body of the request that triggered the event in the container."),
  custom_data JSON OPTIONS(description="JSON string representation of any custom data supplied to the tag as key-value pairs.")
)
-- Optional
PARTITION BY _PARTITIONDATE -- Partition by day
CLUSTER BY tag_name; -- Cluster by tag_name or type
```

## Open Source

Logger Tag for GTM Server Side is developed and maintained by [Stape Team](https://stape.io/) under the Apache 2.0 license.
