#!/bin/bash

# Read configuration from project-spec.json
URL=$(jq -r '.url' project-spec.json)
OUTPUT_FILE=$(jq -r '.output_file' project-spec.json)

# Run the scraper
node src/scraper.js --url "$URL" --output "$OUTPUT_FILE"