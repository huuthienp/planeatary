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

css_filename="concat.css"
# Check if $css_filename already exists
if [ -f "$root_dir/$css_filename" ]; then
    echo "Error: $root_dir/$css_filename already exists. Please remove or rename it before running this script."
    exit 1
fi

# Find all CSS files, concatenate them, and output to $css_filename
find "$root_dir" -type f -name "*.css" ! -name "$css_filename" | sort | xargs cat > "$root_dir/$css_filename"

# Check if the concatenation was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to concatenate CSS files."
    exit 1
fi

# Delete all other CSS files except $css_filename
find "$root_dir" -name "*.css" -type f ! -name "$css_filename" -delete

echo "All CSS files have been concatenated into $root_dir/$css_filename and other CSS files have been deleted."
