#!/bin/bash

# If there are 2 or more arguments provided, exits with an error message
if [ "$#" -ge 2 ]; then
    echo "Error: Too many arguments provided. Usage: $(basename "$0") [optional_path]"
    exit 1
fi

# Check if an argument is provided
# Set the root directory
if [ -n "$1" ]; then
    root_dir="$1"
else
    root_dir=$PWD
fi

# Find all index.html files recursively
find "$root_dir" -type f -name "*.html" | while read -r file; do
    # Get the parent directory name
    parent_dir=$(basename "$(dirname "$file")")

    # Create new filename
    new_filename="${parent_dir}.html"

    # Move and rename the file
    mv "$file" "$root_dir/$new_filename"

    echo "Moved and renamed: $file -> $root_dir/$new_filename"
done
